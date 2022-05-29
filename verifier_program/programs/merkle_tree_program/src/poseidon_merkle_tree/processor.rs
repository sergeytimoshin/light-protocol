use crate::poseidon_merkle_tree::instructions::*;
use crate::poseidon_merkle_tree::instructions_poseidon::{
    poseidon_0, poseidon_1, poseidon_2,
};
use crate::utils::config::{MERKLE_TREE_ACC_BYTES_ARRAY, ENCRYPTED_UTXOS_LENGTH};
use crate::state::MerkleTreeTmpPda;
use crate::poseidon_merkle_tree::state::TwoLeavesBytesPda;
use crate::poseidon_merkle_tree::state::{
    InitMerkleTreeBytes, MerkleTree,
};
use crate::{IX_ORDER, TWO_LEAVES_PDA_SIZE};
use anchor_lang::solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    msg,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::rent::Rent,
    sysvar::Sysvar,
};
use std::convert::TryFrom;

const MERKLE_TREE_UPDATE_START: u8 = 14;
const MERKLE_TREE_UPDATE_LEVEL: u8 = 25;

const LOCK_START: u8 = 34;

// duration measured in slots
const LOCK_DURATION: u64 = 60;
const HASH_0: u8 = 0;
const HASH_1: u8 = 1;
const HASH_2: u8 = 2;
const ROOT_INSERT: u8 = 241;

pub struct MerkleTreeProcessor<'a, 'b> {
    merkle_tree_pda: Option<&'a AccountInfo<'b>>,
    tmp_storage_pda: Option<&'a AccountInfo<'b>>,
    unpacked_merkle_tree: MerkleTree,
    program_id: Pubkey,
}

impl<'a, 'b> MerkleTreeProcessor<'a, 'b> {
    pub fn new(
        tmp_storage_pda: Option<&'a AccountInfo<'b>>,
        merkle_tree_pda: Option<&'a AccountInfo<'b>>,
        program_id: Pubkey,
    ) -> Result<Self, ProgramError> {
        let empty_smt = MerkleTree {
            is_initialized: false,
            levels: 1,
            filled_subtrees: vec![vec![0_u8; 1]; 1],
            //zeros: vec![vec![0 as u8; 1];1],
            current_root_index: 0,
            next_index: 0,
            root_history_size: 10,
            roots: vec![0_u8; 1],
            //leaves: vec![0],
            current_total_deposits: 0,
            inserted_leaf: false,
            inserted_root: false,
            pubkey_locked: vec![0],
            time_locked: 0,
        };

        Ok(MerkleTreeProcessor {
            merkle_tree_pda,
            tmp_storage_pda,
            unpacked_merkle_tree: empty_smt,
            program_id,
        })
    }

    #[allow(clippy::manual_memcpy)]
    pub fn initialize_new_merkle_tree_from_bytes(
        &mut self,
        init_bytes: &[u8],
    ) -> Result<(), ProgramError> {
        let mut unpacked_init_merkle_tree =
            InitMerkleTreeBytes::unpack(&self.merkle_tree_pda.unwrap().data.borrow())?;

        for i in 0..unpacked_init_merkle_tree.bytes.len() {
            unpacked_init_merkle_tree.bytes[i] = init_bytes[i];
        }

        InitMerkleTreeBytes::pack_into_slice(
            &unpacked_init_merkle_tree,
            &mut self.merkle_tree_pda.unwrap().data.borrow_mut(),
        );
        if unpacked_init_merkle_tree.bytes[0..init_bytes.len()] != init_bytes[..] {
            msg!("merkle tree init failed");
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(())
    }


    pub fn process_instruction(&mut self, accounts: &[AccountInfo], tmp_storage_pda_data: &mut MerkleTreeTmpPda, instruction_data: Option<&[u8]>) -> Result<(), ProgramError> {
        let account = &mut accounts.iter();
        let _signer = next_account_info(account)?;
        let _tmp_storage_pda = next_account_info(account)?;
        msg!(
            "tmp_storage_pda_data.current_instruction_index {}",
            tmp_storage_pda_data.current_instruction_index
        );

        if tmp_storage_pda_data.current_instruction_index < IX_ORDER.len()
            && (IX_ORDER[tmp_storage_pda_data.current_instruction_index]
                == MERKLE_TREE_UPDATE_START
                || IX_ORDER[tmp_storage_pda_data.current_instruction_index]
                    == MERKLE_TREE_UPDATE_LEVEL)
        {
            let merkle_tree_pda = next_account_info(account)?;
            let mut merkle_tree_pda_data = MerkleTree::unpack(&merkle_tree_pda.data.borrow())?;

            // merkle_tree_pubkey_check(
            //     *merkle_tree_pda.key,
            //     tmp_storage_pda_data.merkle_tree_index,
            //     *merkle_tree_pda.owner,
            //     self.program_id,
            // )?;
            pubkey_check(
                *_tmp_storage_pda.key,
                Pubkey::new(&merkle_tree_pda_data.pubkey_locked),
                String::from("Merkle tree locked by another account."),
            )?;

            _process_instruction(
                IX_ORDER[tmp_storage_pda_data.current_instruction_index],
                tmp_storage_pda_data,
                &mut merkle_tree_pda_data,
            )?;
            tmp_storage_pda_data.changed_state = 4;

            MerkleTree::pack_into_slice(
                &merkle_tree_pda_data,
                &mut merkle_tree_pda.data.borrow_mut(),
            );
        } else if tmp_storage_pda_data.current_instruction_index < IX_ORDER.len()
            && IX_ORDER[tmp_storage_pda_data.current_instruction_index] == LOCK_START
        {
            let merkle_tree_pda = next_account_info(account)?;
            let mut merkle_tree_pda_data = MerkleTree::unpack(&merkle_tree_pda.data.borrow())?;
            let current_slot = <Clock as Sysvar>::get()?.slot;
            msg!("Current slot: {:?}", current_slot);

            msg!("Locked at slot: {}", merkle_tree_pda_data.time_locked);
            msg!(
                "Lock ends at slot: {}",
                merkle_tree_pda_data.time_locked + LOCK_DURATION
            );

            //lock
            if merkle_tree_pda_data.time_locked == 0
                || merkle_tree_pda_data.time_locked + LOCK_DURATION < current_slot
            {
                merkle_tree_pda_data.time_locked = <Clock as Sysvar>::get()?.slot;
                merkle_tree_pda_data.pubkey_locked = _tmp_storage_pda.key.to_bytes().to_vec();
                msg!("Locked at slot: {}", merkle_tree_pda_data.time_locked);
                msg!(
                    "Locked by: {:?}",
                    Pubkey::new(&merkle_tree_pda_data.pubkey_locked)
                );
            } else if merkle_tree_pda_data.time_locked + LOCK_DURATION > current_slot {
                msg!("Contract is still locked.");
                return Err(ProgramError::InvalidInstructionData);
            } else {
                merkle_tree_pda_data.time_locked = <Clock as Sysvar>::get()?.slot;
                merkle_tree_pda_data.pubkey_locked = _tmp_storage_pda.key.to_bytes().to_vec();
            }

            // merkle_tree_pubkey_check(
            //     *merkle_tree_pda.key,
            //     tmp_storage_pda_data.merkle_tree_index,
            //     *merkle_tree_pda.owner,
            //     self.program_id,
            // )?;
            MerkleTree::pack_into_slice(
                &merkle_tree_pda_data,
                &mut merkle_tree_pda.data.borrow_mut(),
            );
        } else if IX_ORDER[tmp_storage_pda_data.current_instruction_index] == HASH_0
            || IX_ORDER[tmp_storage_pda_data.current_instruction_index] == HASH_1
            || IX_ORDER[tmp_storage_pda_data.current_instruction_index] == HASH_2
        {
            let merkle_tree_pda = next_account_info(account)?;
            // merkle_tree_pubkey_check(
            //     *merkle_tree_pda.key,
            //     tmp_storage_pda_data.merkle_tree_index,
            //     *merkle_tree_pda.owner,
            //     self.program_id,
            // )?;
            //hash instructions do not need the merkle tree
            _process_instruction(
                IX_ORDER[tmp_storage_pda_data.current_instruction_index],
                tmp_storage_pda_data,
                &mut self.unpacked_merkle_tree,
            )?;
            tmp_storage_pda_data.changed_state = 2;

        } else if IX_ORDER[tmp_storage_pda_data.current_instruction_index] == ROOT_INSERT {
            //inserting root and creating leave pda accounts
            msg!(
                "Root insert Instruction: {}",
                IX_ORDER[tmp_storage_pda_data.current_instruction_index]
            );
            let merkle_tree_pda = next_account_info(account)?;
            let leaf_pda = next_account_info(account)?;
            let mut leaf_pda_account_data = TwoLeavesBytesPda::unpack(&leaf_pda.data.borrow())?;
            let mut merkle_tree_pda_data = MerkleTree::unpack(&merkle_tree_pda.data.borrow())?;
            let _system_program_account = next_account_info(account)?;
            let rent_sysvar_info = next_account_info(account)?;
            let rent = &Rent::from_account_info(rent_sysvar_info)?;

            //checking if signer locked
            pubkey_check(
                *_tmp_storage_pda.key,
                Pubkey::new(&merkle_tree_pda_data.pubkey_locked),
                String::from("Merkle tree locked by other account."),
            )?;
            //checking merkle tree pubkey for consistency
            // merkle_tree_pubkey_check(
            //     *merkle_tree_pda.key,
            //     tmp_storage_pda_data.merkle_tree_index,
            //     *merkle_tree_pda.owner,
            //     self.program_id,
            // )?;

            //insert root into merkle tree
            insert_last_double(&mut merkle_tree_pda_data, tmp_storage_pda_data)?;

            //check leaves account is rent exempt
            //let rent = Rent::default();
            if !rent.is_exempt(
                **leaf_pda.lamports.borrow(),
                usize::try_from(TWO_LEAVES_PDA_SIZE).unwrap(),
            ) {
                msg!("Leaves account is not rent-exempt.");
                return Err(ProgramError::InvalidAccountData);
            }
            //save leaves into pda account
            leaf_pda_account_data.node_left = tmp_storage_pda_data.leaf_left.clone();
            leaf_pda_account_data.node_right = tmp_storage_pda_data.leaf_right.clone();
            //increased by 2 because we're inserting 2 leaves at once
            leaf_pda_account_data.left_leaf_index = merkle_tree_pda_data.next_index - 2;
            leaf_pda_account_data.merkle_tree_pubkey = tmp_storage_pda_data.merkle_tree_pda_pubkey.clone();
            // anchor pads encryptedUtxos of length 222 to 254 with 32 zeros in front
            leaf_pda_account_data.encrypted_utxos = instruction_data.unwrap()[32..254].to_vec();

            msg!("Lock set at slot: {}", merkle_tree_pda_data.time_locked);
            msg!("Lock released at slot: {}", <Clock as Sysvar>::get()?.slot);
            merkle_tree_pda_data.time_locked = 0;
            merkle_tree_pda_data.pubkey_locked = vec![0; 32];

            MerkleTree::pack_into_slice(
                &merkle_tree_pda_data,
                &mut merkle_tree_pda.data.borrow_mut(),
            );
            TwoLeavesBytesPda::pack_into_slice(
                &leaf_pda_account_data,
                &mut leaf_pda.data.borrow_mut(),
            );
        }
        msg!("tmp_storage_pda_data.current_instruction_index : {}", tmp_storage_pda_data.current_instruction_index );
        msg!("tmp_storage_pda_data.current_instruction_index : {:?}", IX_ORDER[tmp_storage_pda_data.current_instruction_index] );
        tmp_storage_pda_data.current_instruction_index += 1;

        MerkleTreeTmpPda::pack_into_slice(
            &tmp_storage_pda_data,
            &mut self.tmp_storage_pda.unwrap().data.borrow_mut(),
        );
        Ok(())
    }
}

pub fn _process_instruction(
    id: u8,
    tmp_storage_pda_data: &mut MerkleTreeTmpPda,
    merkle_tree_pda_data: &mut MerkleTree,
) -> Result<(), ProgramError> {
    msg!("executing instruction {}", id);
    if id == HASH_0 {
        poseidon_0(
            tmp_storage_pda_data
        )?;
    } else if id == HASH_1 {
        poseidon_1(
            tmp_storage_pda_data
        )?;
    } else if id == HASH_2 {
        poseidon_2(
            tmp_storage_pda_data
        )?;
    } else if id == MERKLE_TREE_UPDATE_LEVEL {
        insert_1_inner_loop(merkle_tree_pda_data, tmp_storage_pda_data)?;
    } else if id == MERKLE_TREE_UPDATE_START {
        insert_0_double(merkle_tree_pda_data, tmp_storage_pda_data)?;
    }
    Ok(())
}

fn merkle_tree_pubkey_check(
    account_pubkey: Pubkey,
    merkle_tree_index: usize,
    merkle_tree_pda_owner: Pubkey,
    program_id: Pubkey,
) -> Result<(), ProgramError> {
    if account_pubkey
        != Pubkey::new(
            &MERKLE_TREE_ACC_BYTES_ARRAY
                [merkle_tree_index]
            .0,
        )
    {
        msg!(
            "invalid merkle tree {:?}, {:?}",
            account_pubkey,
            Pubkey::new(
                &MERKLE_TREE_ACC_BYTES_ARRAY
                    [merkle_tree_index]
                .0
            )
        );
        return Err(ProgramError::InvalidAccountData);
    }
    if merkle_tree_pda_owner != program_id {
        msg!("Invalid merkle tree owner.");
        return Err(ProgramError::IllegalOwner);
    }
    Ok(())
}

fn pubkey_check(
    account_pubkey0: Pubkey,
    account_pubkey1: Pubkey,
    msg: String,
) -> Result<(), ProgramError> {
    if account_pubkey0 != account_pubkey1 {
        msg!(&msg);
        return Err(ProgramError::InvalidInstructionData);
    }

    Ok(())
}