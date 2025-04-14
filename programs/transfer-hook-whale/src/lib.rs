use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount};
use spl_transfer_hook_interface::instruction::TransferHookInstruction;

declare_id!("7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg");

#[program]
pub mod transfer_hook_whale {
    use super::*;

    pub fn initialize_extra_account(ctx: Context<InitializeExtraAccountMeta>) -> Result<()> {
        ctx.accounts.log_tracker.owner = ctx.accounts.payer.key();
        ctx.accounts.log_tracker.total_transfers = 0;
        ctx.accounts.log_tracker.last_amount = 0;
        Ok(())
    }

    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        ctx.accounts.log_tracker.total_transfers += 1;
        ctx.accounts.log_tracker.last_amount = amount;
        Ok(())
    }

    pub fn fallback<'info>(program_id: &Pubkey, accounts: &'info [AccountInfo<'info>], data: &[u8]) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => Err(ProgramError::InvalidInstructionData.into())
        }
    }
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMeta<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(init, seeds=[b"log-tracker", mint.key().as_ref()], bump, payer=payer, space=8+32+8+8)]
    pub log_tracker: Account<'info, LogTracker>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(token::mint = mint, token::authority = owner)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    pub owner: UncheckedAccount<'info>,
    #[account(mut, seeds=[b"log-tracker", mint.key().as_ref()], bump)]
    pub log_tracker: Account<'info, LogTracker>,
}

#[account]
pub struct LogTracker {
    pub owner: Pubkey,
    pub total_transfers: u64,
    pub last_amount: u64,
}
