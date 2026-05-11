// Solana Program Addresses
// Last updated: 2025-11-09 (X402 Integration)

export const SOLANA_PROGRAM_ADDRESSES = {
  TESTNET: {
    PROGRAM_ID: "21ZxZQtJZ3M3SDP7cGa3oydDpAAVaoVu8sh4RYLKCDLy", // X402-enabled program
    FACTORY_PDA: "7b4EAgi4dftrXTYksGnrsVW5dCU1Fh47C3iSwq6bbw37",
    PLATFORM_TREASURY: "CBDjvUkZZ6ucrVGrU3vRraasTytha8oVg2NLCxAHE25b",
  },
  DEVNET: {
    PROGRAM_ID: "21ZxZQtJZ3M3SDP7cGa3oydDpAAVaoVu8sh4RYLKCDLy",
    FACTORY_PDA: "7b4EAgi4dftrXTYksGnrsVW5dCU1Fh47C3iSwq6bbw37",
    PLATFORM_TREASURY: "CBDjvUkZZ6ucrVGrU3vRraasTytha8oVg2NLCxAHE25b",
  },
  MAINNET: {
    PROGRAM_ID: null as unknown as string, // Not yet deployed - will throw if used
    FACTORY_PDA: null as unknown as string,
    PLATFORM_TREASURY: null as unknown as string,
  }
} as const;

export const DEPLOYMENT_INFO = {
  "network": "solana-testnet",
  "cluster": "testnet",
  "deployer": "CBDjvUkZZ6ucrVGrU3vRraasTytha8oVg2NLCxAHE25b",
  "programs": {
    "AgentFactory": {
      "programId": "21ZxZQtJZ3M3SDP7cGa3oydDpAAVaoVu8sh4RYLKCDLy",
      "factoryPda": "7b4EAgi4dftrXTYksGnrsVW5dCU1Fh47C3iSwq6bbw37"
    }
  },
  "timestamp": "2025-11-09T15:00:00.000Z",
  "features": ["x402-payment-protocol"]
} as const;
