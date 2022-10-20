use crate::config;
use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

/// Configures the authority of the merkle tree which can:
/// - register new verifiers
/// - register new asset pools
/// - register new asset pool types
/// - set permissions for new asset pool creation
#[account]
pub struct MerkleTreeAuthority {
    pub pubkey: Pubkey,
    pub enable_nfts: bool,
    pub enable_permissionless_spl_tokens: bool,
    pub enable_permissionless_merkle_tree_registration: bool,
    pub merkle_tree_index: u64,
    pub registered_asset_index: u64
}


#[derive(Accounts)]
pub struct InitializeMerkleTreeAuthority<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [&b"MERKLE_TREE_AUTHORITY"[..]],
        bump,
        space = 8 + 32 + 8 + 8 + 8
    )]
    pub merkle_tree_authority_pda: Account<'info, MerkleTreeAuthority>,
    /// CHECK:` Signer is merkle tree authority.
    #[account(mut, address=anchor_lang::prelude::Pubkey::new(&config::INITIAL_MERKLE_TREE_AUTHORITY) @ErrorCode::InvalidAuthority)]
    pub authority: Signer<'info>,
    /// CHECK:` New authority no need to be checked
    pub new_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct UpdateMerkleTreeAuthority<'info> {
    #[account(seeds = [&b"MERKLE_TREE_AUTHORITY"[..]], bump)]
    pub merkle_tree_authority_pda: Account<'info, MerkleTreeAuthority>,
    /// CHECK:` Signer is merkle tree authority.
    #[account(mut, address=merkle_tree_authority_pda.pubkey @ErrorCode::InvalidAuthority)]
    pub authority: Signer<'info>,
    /// CHECK:` New authority no need to be checked
    pub new_authority: UncheckedAccount<'info>
}