use anchor_lang::prelude::*;

pub mod process_mint;
pub mod process_transfer;

pub use process_mint::*;
pub use process_transfer::*;

declare_id!("9sixVEthz2kMSKfeApZXHwuboT6DZuT6crAYJTciUCqE");

#[cfg(not(feature = "no-entrypoint"))]
solana_security_txt::security_txt! {
    name: "psp-compressed-token",
    project_url: "lightprotocol.com",
    contacts: "email:security@lightprotocol.com",
    policy: "https://github.com/Lightprotocol/light-protocol/blob/main/SECURITY.md",
    source_code: "https://github.com/Lightprotocol/light-protocol"
}

#[constant]
pub const PROGRAM_ID: &str = "9sixVEthz2kMSKfeApZXHwuboT6DZuT6crAYJTciUCqE";

#[program]
pub mod psp_compressed_token {

    use super::*;

    pub fn create_mint<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateMintInstruction<'info>>,
    ) -> Result<()> {
        process_create_mint(ctx)
    }

    pub fn mint_to<'info>(
        ctx: Context<'_, '_, '_, 'info, MintToInstruction<'info>>,
        compression_public_keys: Vec<[u8; 32]>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        process_mint_to(ctx, compression_public_keys, amounts)
    }

    pub fn transfer<'info>(
        ctx: Context<'_, '_, '_, 'info, TransferInstruction<'info>>,
        inputs: Vec<u8>,
    ) -> Result<()> {
        process_transfer::process_transfer(ctx, inputs)
    }

    // TODO: implement update mint, freeze utxo, thaw utxo
    // pub fn update_mint<'info>(
    //     ctx: Context<'_, '_, '_, 'info, InstructionUpdateMint<'info>>,
    //     decimals: u64,
    //     freeze_authority: Pubkey,
    // ) -> Result<()> {
    //     if ctx.accounts.new_authority.is_some() {
    //         if ctx.accounts.new_authority_pda.is_none() {
    //             return Err(ErrorCode::MissingNewAuthorityPda);
    //         }
    //         cpi_update_mint_account(
    //             &ctx.accounts.authority.key(),
    //             &ctx.accounts.new_authority.unwrap().key(),
    //             ctx.accounts.mint.to_account_info().clone(),
    //         )?;
    //     }
    //     if ctx.accounts.new_freeze_authority.is_some() {
    //         cpi_update_mint_account(
    //             &ctx.accounts.authority.key(),
    //             &ctx.accounts.new_freeze_authority.unwrap().key(),
    //             ctx.accounts.mint.to_account_info().clone(),
    //         )?;
    //     }
    //     Ok(())
    // }

    // #[derive(Accounts)]
    // pub struct InstructionUpdateMint {
    //     pub fee_payer: Signer<'info>,
    //     pub authority: Signer<'info>,
    //     #[account(init, constraint= mint.mint_authority == *authority_pda.key(),)]
    //     pub mint: AccountInfo<'info, Mint>,
    //     /// Mint authority, ensures that this program needs to be used as a proxy to mint tokens
    //     #[account(seeds = [b"authority",signer.key().to_bytes(), mint.key().to_bytes()], bump,)]
    //     pub authority_pda: AccountInfo<'info>,
    //     pub token_program: Program<'info, Token>,
    //     pub new_authority: Option<AccountInfo<'info>>,
    //     #[account(seeds = [b"authority",signer.key().to_bytes(), mint.key().to_bytes()], bump,)]
    //     pub new_authority_pda: Option<AccountInfo<'info>>,
    //     pub new_freeze_authority: Option<Pubkey>,
    // }

    // pub fn freeze_utxo<'info>(
    //     ctx: Context<'_, '_, '_, 'info, InstructionFreezeUtxo<'info>>,
    //     utxo_version: u64,
    //     utxo_pool_type: u64,
    //     utxo_amount_sol: u64,
    //     utxo_amount_spl: u64,
    //     utxo_blinding: [u8; 31],
    //     utxo_owner: [u8; 32],
    //     utxo_data_hash: [u8; 32],
    //     utxo_meta_hash: [u8; 32],
    //     utxo_address: [u8; 32],
    //     proof: CompressedProof,
    //     merkle_root_index: u16,
    // ) -> Result<()> {

    //     let utxo = Utxo {
    //         version: utxo_version,
    //         pool_type: utxo_pool_type,
    //         amounts: [utxo_amount_sol, utxo_amount_spl],
    //         spl_asset_mint: hash_and_truncate(ctx.accounts.mint.to_account_info().key().to_bytes()),
    //         owner: utxo_owner,
    //         blinding: utxo_blinding,
    //         data_hash: utxo_data_hash,
    //         meta_hash: utxo_meta_hash,
    //         address: utxo_address,
    //         message: None,
    //     };

    //     verify_utxo_inclusion_proof(&proot, &ctx.accounts.merkle_tree_set, merkle_root_index, utxo_hash)?;

    //     nullify_utxo(
    //         &ctx.accounts.registered_verifier_pda,
    //         &ctx.accounts.merkle_tree_set,
    //         utxo_hash,
    //     )?;

    //     self.frozen_utxo_pda.utxo_hash = utxo_hash;

    //     Ok(())
    // }

    // #[derive(Accounts)]
    // #[instruction(utxo_hash: [u8; 32])]
    // pub struct InstructionFreezeUtxo {
    //     pub fee_payer: Signer<'info>,
    //     pub freez_authority: Signer<'info>,
    //     /// Check that freeze_authority_pda is freeze authority
    //     #[account(constraint= mint.freez_authority == *freez_authority.key())]
    //     pub mint: Mint<'info, Mint>,
    //     /// Used to sign transactions
    //     #[account(seeds = [signer.key().to_bytes()], bump,)]
    //     pub authority_pda: AccountInfo<'info>,
    //     pub system_program: Program<'info, System>,
    //     /// CHECK this account
    //     pub registered_verifier_pda: AccountInfo<'info>,
    //     pub merkle_tree_set: MerkleTreeSet<'info>,
    //     #[account(init, seeds = [b"frozen_utxo", utxo_hash.as_ref()], bump, payer = fee_payer, space = 32)]
    //     pub frozen_utxo_pda: Account<'info, FrozenUtxo>,
    // }

    // #[account]
    // pub struct FrozenUtxo{
    //     utxo_hash: [u8;32],
    //     leaf_index: u64,
    // }

    // pub fn thaw_utxo<'info>(
    //     ctx: Context<'_, '_, '_, 'info, InstructionThawUtxo<'info>>,
    // ) -> Result<()> {

    //     insert_utxo_into_state_tree_again(
    //         &ctx.accounts.registered_verifier_pda,
    //         &ctx.accounts.merkle_tree_set,
    //         utxo_hash,
    //         leaf_index,
    //     )?;
    //     Ok(())
    // }

    // #[derive(Accounts)]
    // #[instruction(utxo_hash: [u8; 32])]
    // pub struct InstructionThawUtxo {
    //     pub fee_payer: Signer<'info>,
    //     pub freez_authority: Signer<'info>,
    //     /// Check that freez_authority_pda is freeze authority
    //     #[account(constraint= mint.freez_authority == *freez_authority.key())]
    //     pub mint: Mint<'info, Mint>,
    //     /// Used to sign transactions
    //     #[account(seeds = [signer.key().to_bytes()], bump,)]
    //     pub authority_pda: AccountInfo<'info>,
    //     /// CHECK this account
    //     pub registered_verifier_pda: AccountInfo<'info>,
    //     pub merkle_tree_set: MerkleTreeSet<'info>,
    //     #[account(seeds = [b"frozen_utxo", frozen_utxo_pda.utxo_hash.as_ref()], bump, close=fee_payer)]
    //     pub frozen_utxo_pda: Account<'info, FrozenUtxo>,
    // }
}

// verifier sdk improvements
// - bundle into verify, get public inputs, de_compress
#[error_code]
pub enum ErrorCode {
    #[msg("public keys and amounts must be of same length")]
    PublicKeyAmountMissmatch,
    #[msg("missing new authority pda")]
    MissingNewAuthorityPda,
}

// // TODO: unify these structures one way would be to put them into the registry program and import that into verifier sdk
// // so that all accounts we use for serializeation in ts come from the registry program
// #[account]
// pub struct ParsingUtxo {
//     pub version: u64,
//     pub pool_type: u64,
//     pub amounts: [u64; 2],
//     pub spl_asset_mint: Pubkey,
//     pub owner: [u8; 32],
//     pub blinding: [u8; 31],
//     pub data_hash: [u8; 32],
//     pub meta_hash: [u8; 32],
//     pub address: [u8; 32],
//     pub message: Option<Vec<u8>>,
// }

// #[account]
// pub struct ParsingPublicTransactionEvent {
//     pub in_utxo_hashes: Vec<[u8; 32]>,
//     pub out_utxos: Vec<ParsingUtxo>,
//     pub out_utxo_indexes: Vec<u64>,

//     // Fields used when (de)compression
//     pub public_amount_sol: Option<[u8; 32]>,
//     pub public_amount_spl: Option<[u8; 32]>,
//     pub rpc_fee: Option<u64>,
//     // Program utxo fields
//     pub message: Option<Vec<u8>>,
//     pub transaction_hash: Option<[u8; 32]>,
//     pub program_id: Option<Pubkey>,
// }
