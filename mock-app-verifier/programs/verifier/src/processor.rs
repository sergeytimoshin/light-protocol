use crate::verifying_key::VERIFYINGKEY;
use crate::LightInstructionFirst;
use crate::LightInstructionSecond;
use anchor_lang::prelude::*;
use light_verifier_sdk::light_transaction::VERIFIER_STATE_SEED;
use light_verifier_sdk::{
    light_app_transaction::AppTransaction,
    light_transaction::{Config, Transaction},
};

#[derive(Clone)]
pub struct TransactionsConfig;
impl Config for TransactionsConfig {
    /// Number of nullifiers to be inserted with the transaction.
    const NR_NULLIFIERS: usize = 4;
    /// Number of output utxos.
    const NR_LEAVES: usize = 4;
    /// Number of checked public inputs, Kyc, Invoking Verifier, Apphash.
    const NR_CHECKED_PUBLIC_INPUTS: usize = 3;
    /// ProgramId in bytes.
    const ID: [u8; 32] = [
        218, 7, 92, 178, 255, 94, 198, 129, 118, 19, 222, 83, 11, 105, 42, 135, 53, 71, 119, 105,
        218, 71, 67, 12, 189, 129, 84, 51, 92, 74, 131, 39,
    ];
}

pub fn process_transfer_4_ins_4_outs_4_checked_first<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, LightInstructionFirst<'info>>,
    proof_a: &'a [u8; 64],
    proof_b: &'a [u8; 128],
    proof_c: &'a [u8; 64],
    public_amount: &'a [u8; 32],
    nullifiers: &'a [[u8; 32]; 4],
    leaves: &'a [[[u8; 32]; 2]; 2],
    fee_amount: &'a [u8; 32],
    checked_public_inputs: &'a Vec<Vec<u8>>,
    encrypted_utxos: &'a Vec<u8>,
    pool_type: &'a [u8; 32],
    root_index: &'a u64,
    relayer_fee: &'a u64,
) -> Result<()> {
    let tx = Transaction::<2, 4, TransactionsConfig>::new(
        proof_a,
        proof_b,
        proof_c,
        public_amount,
        fee_amount,
        checked_public_inputs,
        nullifiers,
        leaves,
        encrypted_utxos,
        *relayer_fee,
        (*root_index).try_into().unwrap(),
        pool_type, //pool_type
        None,
        &VERIFYINGKEY,
    );
    ctx.accounts.verifier_state.set_inner(tx.into());
    ctx.accounts.verifier_state.signer = *ctx.accounts.signing_address.key;
    Ok(())
}

pub fn process_transfer_4_ins_4_outs_4_checked_second<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, LightInstructionSecond<'info>>,
    proof_a_app: &'a [u8; 64],
    proof_b_app: &'a [u8; 128],
    proof_c_app: &'a [u8; 64],
    proof_a_verifier: &'a [u8; 64],
    proof_b_verifier: &'a [u8; 128],
    proof_c_verifier: &'a [u8; 64],
) -> Result<()> {
    // verify app proof
    let mut app_verifier = AppTransaction::<TransactionsConfig>::new(
        proof_a_app,
        proof_b_app,
        proof_c_app,
        ctx.accounts.verifier_state.checked_public_inputs.clone(),
        &VERIFYINGKEY,
    );

    app_verifier.verify()?;

    let (_, bump) = anchor_lang::prelude::Pubkey::find_program_address(
        &[
            ctx.accounts.signing_address.key().to_bytes().as_ref(),
            VERIFIER_STATE_SEED.as_ref(),
        ],
        ctx.program_id,
    );

    let bump = &[bump];
    let accounts = verifier_program_two::cpi::accounts::LightInstruction {
        verifier_state: ctx.accounts.verifier_state.to_account_info().clone(),
        signing_address: ctx.accounts.signing_address.to_account_info().clone(),
        authority: ctx.accounts.authority.to_account_info().clone(),
        system_program: ctx.accounts.system_program.to_account_info().clone(),
        registered_verifier_pda: ctx
            .accounts
            .registered_verifier_pda
            .to_account_info()
            .clone(),
        program_merkle_tree: ctx.accounts.program_merkle_tree.to_account_info().clone(),
        merkle_tree: ctx.accounts.merkle_tree.to_account_info().clone(),
        token_program: ctx.accounts.token_program.to_account_info().clone(),
        sender: ctx.accounts.sender.to_account_info().clone(),
        recipient: ctx.accounts.recipient.to_account_info().clone(),
        sender_fee: ctx.accounts.sender_fee.to_account_info().clone(),
        recipient_fee: ctx.accounts.recipient_fee.to_account_info().clone(),
        // relayer recipient and escrow will never be used in the same transaction
        relayer_recipient: ctx.accounts.relayer_recipient.to_account_info().clone(),
        token_authority: ctx.accounts.token_authority.to_account_info().clone(),
    };

    let seed = &ctx.accounts.signing_address.key().to_bytes();
    let domain_separation_seed = VERIFIER_STATE_SEED;
    let cpi_seed = &[seed, domain_separation_seed, bump];
    let final_seed = &[&cpi_seed[..]];
    let mut cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.verifier_program.to_account_info().clone(),
        accounts,
        final_seed,
    );
    cpi_ctx = cpi_ctx.with_remaining_accounts(ctx.remaining_accounts.to_vec());

    verifier_program_two::cpi::shielded_transfer_inputs(
        cpi_ctx,
        *proof_a_verifier,
        *proof_b_verifier,
        *proof_c_verifier,
        <Vec<u8> as TryInto<[u8; 32]>>::try_into(
            ctx.accounts.verifier_state.checked_public_inputs[1].to_vec(),
        )
        .unwrap(),
    )
}
