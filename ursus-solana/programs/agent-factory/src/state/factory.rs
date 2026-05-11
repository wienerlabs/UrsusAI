use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AgentFactory {
    /// Authority that can update factory settings
    pub authority: Pubkey,

    /// Platform treasury for collecting fees
    pub platform_treasury: Pubkey,

    /// Fee required to create a new agent (in lamports)
    pub creation_fee: u64,

    /// Total number of agents created
    pub total_agents: u64,

    /// Platform trading fee in basis points (e.g. 100 = 1%)
    pub platform_fee_bps: u16,

    /// Creator trading fee in basis points (e.g. 100 = 1%)
    pub creator_fee_bps: u16,

    /// Bump seed for PDA
    pub bump: u8,
}

impl AgentFactory {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 2 + 2 + 1;
}

