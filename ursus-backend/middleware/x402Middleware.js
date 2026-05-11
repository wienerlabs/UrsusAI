const { Connection, PublicKey } = require('@solana/web3.js');

// Solana connection
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Program ID
const PROGRAM_ID = new PublicKey('21ZxZQtJZ3M3SDP7cGa3oydDpAAVaoVu8sh4RYLKCDLy');

// Track used payment signatures to prevent replay attacks
const usedSignatures = new Map(); // signature -> timestamp
// Clean expired entries every 10 minutes
setInterval(() => {
  const cutoff = Math.floor(Date.now() / 1000) - 600; // 10 min expiry
  for (const [sig, time] of usedSignatures) {
    if (time < cutoff) usedSignatures.delete(sig);
  }
}, 10 * 60 * 1000);

/**
 * X402 Payment Middleware
 * Checks if payment is required and validates payment signature
 */
const checkX402Payment = async (req, res, next) => {
  try {
    const { agentAddress } = req.params;
    const paymentSignature = req.body.paymentSignature || req.headers['x-payment-signature'];
    const serviceId = req.body.serviceId || req.query.serviceId || 'default_service';

    // Get X402 config for this agent
    const agentPubkey = new PublicKey(agentAddress);
    const [x402ConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('x402_config'), agentPubkey.toBuffer()],
      PROGRAM_ID
    );

    let x402Config;
    try {
      const accountInfo = await connection.getAccountInfo(x402ConfigPDA);
      if (!accountInfo) {
        // No X402 config, service is free
        return next();
      }

      // Decode X402 config account layout:
      // 0-8: discriminator
      // 8-40: agent (Pubkey 32 bytes)
      // 40-72: payment_recipient (Pubkey 32 bytes)
      // 72: enabled (bool, 1 byte)
      // 73-81: min_payment_amount (u64)
      // 81-89: max_payment_amount (u64)
      const data = accountInfo.data;
      const enabled = data[72] === 1;

      if (!enabled) {
        // X402 disabled, service is free
        return next();
      }

      const minPayment = data.readBigUInt64LE(73);
      const maxPayment = data.readBigUInt64LE(81);

      x402Config = {
        enabled,
        minPayment: Number(minPayment),
        maxPayment: Number(maxPayment)
      };
    } catch (err) {
      console.error('Error reading X402 config:', err);
      // If can't read config, assume service is free
      return next();
    }

    // If no payment signature provided, return 402
    if (!paymentSignature) {
      return res.status(402).json({
        error: 'Payment Required',
        payment_details: {
          min_amount: x402Config.minPayment / 1_000_000, // Convert to USDC
          max_amount: x402Config.maxPayment / 1_000_000,
          service_id: serviceId,
          agent_address: agentAddress,
          currency: 'USDC'
        }
      });
    }

    // Verify payment signature on blockchain
    const paymentValid = await verifyPaymentSignature(
      paymentSignature,
      agentAddress,
      x402Config.minPayment
    );

    if (!paymentValid) {
      return res.status(402).json({
        error: 'Invalid or insufficient payment',
        payment_details: {
          min_amount: x402Config.minPayment / 1_000_000,
          max_amount: x402Config.maxPayment / 1_000_000,
          service_id: serviceId,
          agent_address: agentAddress,
          currency: 'USDC'
        }
      });
    }

    // Payment verified, attach to request and continue
    req.x402Payment = {
      signature: paymentSignature,
      verified: true,
      serviceId
    };

    next();
  } catch (error) {
    console.error('X402 middleware error:', error);
    return res.status(402).json({
      error: 'Payment verification failed',
      message: 'Unable to verify payment status. Please try again.'
    });
  }
};

/**
 * Verify payment signature on blockchain
 */
async function verifyPaymentSignature(signature, agentAddress, minAmount) {
  try {
    // Check for replay attack - reject already-used signatures
    if (usedSignatures.has(signature)) {
      console.error('Replay attack detected - signature already used:', signature);
      return false;
    }

    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      console.error('Transaction not found:', signature);
      return false;
    }

    // Check if transaction was successful
    if (tx.meta?.err) {
      console.error('Transaction failed:', tx.meta.err);
      return false;
    }

    // Verify transaction is recent (within last 5 minutes)
    const txTime = tx.blockTime;
    const now = Math.floor(Date.now() / 1000);
    if (now - txTime > 300) {
      console.error('Transaction too old:', signature);
      return false;
    }

    // Verify transaction involves our program
    const programIds = tx.transaction.message.staticAccountKeys.map(key => key.toBase58());
    if (!programIds.includes(PROGRAM_ID.toBase58())) {
      console.error('Transaction does not involve our program');
      return false;
    }

    // Verify the payment is for the correct agent by checking account keys
    const accountKeys = tx.transaction.message.staticAccountKeys.map(key => key.toBase58());
    if (!accountKeys.includes(agentAddress)) {
      console.error('Transaction does not involve the specified agent:', agentAddress);
      return false;
    }

    // Mark signature as used to prevent replay
    usedSignatures.set(signature, now);

    console.log('Payment verified:', signature);
    return true;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
}

module.exports = { checkX402Payment };

