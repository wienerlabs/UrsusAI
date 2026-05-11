import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { apiService } from '../services/api';
import idl from '../idl/agent_factory.json';

/**
 * Robust transaction confirmation that polls signature status with a custom timeout.
 * Works around the default 30s timeout in connection.confirmTransaction() which is
 * too short on congested networks.
 */
async function confirmTransactionWithRetry(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  timeoutMs: number = 90_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Try the new strategy-based API first (preferred path)
    try {
      const { value } = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (value !== null) {
        if (value.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(value.err)}`);
        }
        if (value.confirmationStatus === 'confirmed' || value.confirmationStatus === 'finalized') {
          return;
        }
      }

      // Check if we've passed lastValidBlockHeight
      const currentHeight = await connection.getBlockHeight('confirmed');
      if (currentHeight > lastValidBlockHeight) {
        throw new Error(`Transaction expired: block height ${currentHeight} > lastValidBlockHeight ${lastValidBlockHeight}`);
      }
    } catch (err: any) {
      // If the error is "block height exceeded" or similar, give up
      if (err?.message?.includes('failed on-chain') || err?.message?.includes('expired')) {
        throw err;
      }
      // Otherwise retry
    }

    // Sleep 2 seconds between polls
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(
    `Transaction confirmation timed out after ${timeoutMs / 1000}s. ` +
    `Check signature on Solana Explorer: ${signature}`
  );
}

export interface AgentCreationParams {
 name: string;
 symbol: string;
 description: string;
 instructions: string;
 model: string;
 category: string;
 avatar?: string;
 imageUrl?: string;
}

// Solana Testnet configuration - X402 Enabled Program
const PROGRAM_ID = new PublicKey('21ZxZQtJZ3M3SDP7cGa3oydDpAAVaoVu8sh4RYLKCDLy');
const PLATFORM_TREASURY = new PublicKey('CBDjvUkZZ6ucrVGrU3vRraasTytha8oVg2NLCxAHE25b');

/**
 * Solana Agent Factory Hook
 * Creates agents on-chain using user's wallet
 */
export const useAgentFactory = () => {
 const { publicKey, signTransaction, sendTransaction } = useWallet();
 const { connection } = useConnection();

 const [isCreating, setIsCreating] = useState(false);
 const [createError, setCreateError] = useState<Error | null>(null);

 const creationFee = '0.1'; // 0.1 SOL creation fee

 const getCreationFee = useCallback((): string => {
 return creationFee;
 }, []);

 /**
 * Create a new agent token on Solana blockchain
 * This will open the user's wallet for signing
 */
 const createAgentToken = useCallback(async (
 params: AgentCreationParams,
 onSuccess?: (mintAddress: string, txId: string) => void,
 onProgress?: (step: string, progress: number) => void
 ) => {
 console.log(' Creating Solana agent on-chain with params:', params);

 if (!publicKey ||!signTransaction ||!sendTransaction) {
 throw new Error('Wallet not connected');
 }

 try {
 setIsCreating(true);
 setCreateError(null);

 onProgress?.('Checking balance...', 10);

 // Check SOL balance
 const balance = await connection.getBalance(publicKey);
 const balanceInSol = balance / 1e9;
 const requiredBalance = parseFloat(creationFee) + 0.05; // creation fee + transaction fees

 if (balanceInSol < requiredBalance) {
 throw new Error(`Insufficient balance. Required: ${requiredBalance} SOL, Available: ${balanceInSol.toFixed(4)} SOL`);
 }

 onProgress?.('Preparing on-chain transaction...', 20);

 // Create Anchor provider with user's wallet
 const provider = new AnchorProvider(
 connection,
 {
 publicKey,
 signTransaction,
 signAllTransactions: async (txs) => {
 if (!signTransaction) throw new Error('Wallet does not support signing');
 return Promise.all(txs.map(tx => signTransaction(tx)));
 }
 },
 { commitment: 'confirmed' }
 );

 // Initialize Anchor program
 const program = new Program(idl as any, PROGRAM_ID, provider);

 onProgress?.('Fetching factory state...', 30);

 // Derive factory PDA
 const [factoryPda] = await PublicKey.findProgramAddress(
 [Buffer.from('factory')],
 PROGRAM_ID
 );

 // Get factory account to determine agent ID
 const factoryAccount = await program.account.agentFactory.fetch(factoryPda);
 const agentId = factoryAccount.totalAgents as BN;

 console.log(' Factory total agents:', agentId.toString());

 // Convert agentId to little-endian 8-byte buffer
 const agentIdBuffer = Buffer.alloc(8);
 agentId.toArrayLike(Buffer, 'le', 8).copy(agentIdBuffer);

 // Derive agent and mint PDAs
 const [agentPda] = await PublicKey.findProgramAddress(
 [Buffer.from('agent'), agentIdBuffer],
 PROGRAM_ID
 );

 const [mintPda] = await PublicKey.findProgramAddress(
 [Buffer.from('mint'), agentPda.toBuffer()],
 PROGRAM_ID
 );

 console.log(' Agent PDA:', agentPda.toString());
 console.log(' Mint PDA:', mintPda.toString());

 onProgress?.('Creating transaction... (Wallet will open for signing)', 50);

 // Get latest blockhash for proper confirmation strategy
 const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

 // Create agent transaction
 const tx = await program.methods
.createAgent(
 params.name,
 params.symbol,
 params.description || '',
 params.instructions || '',
 params.model || 'gpt-4',
 params.category || 'general'
 )
.accounts({
 factory: factoryPda,
 agent: agentPda,
 mint: mintPda,
 creator: publicKey,
 platformTreasury: PLATFORM_TREASURY,
 tokenProgram: TOKEN_PROGRAM_ID,
 systemProgram: SystemProgram.programId,
 rent: SYSVAR_RENT_PUBKEY,
 })
.transaction();

 tx.recentBlockhash = blockhash;
 tx.feePayer = publicKey;

 onProgress?.('Waiting for wallet signature...', 60);

 // Send transaction (this will open Solflare/Phantom for signing)
 console.log('Requesting wallet signature...');
 const signature = await sendTransaction(tx, connection, {
 skipPreflight: false,
 maxRetries: 3,
 preflightCommitment: 'confirmed',
 });

 console.log('Transaction sent:', signature);
 onProgress?.('Confirming transaction (may take up to 90s)...', 80);

 // Wait for confirmation with proper strategy + extended polling
 await confirmTransactionWithRetry(
   connection,
   signature,
   blockhash,
   lastValidBlockHeight,
   90_000 // 90 second timeout
 );

 console.log(' Transaction confirmed!');
 onProgress?.('Saving to database...', 90);

 // Save to backend database
 try {
 await apiService.post('/agents', {
 name: params.name,
 symbol: params.symbol,
 description: params.description,
 instructions: params.instructions,
 model: params.model,
 category: params.category,
 creatorAddress: publicKey.toBase58(),
 avatar: params.avatar || '',
 imageUrl: params.imageUrl,
 contractAddress: agentPda.toString(),
 mintAddress: mintPda.toString(),
 deploymentTx: signature
 });
 } catch (dbError) {
 console.warn(' Failed to save to database:', dbError);
 // Continue anyway, agent is on-chain
 }

 onProgress?.('Agent created successfully on Solana!', 100);

 if (onSuccess) {
 // Pass contractAddress (agentPda) instead of mintAddress for navigation
 onSuccess(agentPda.toString(), signature);
 }

 return {
 mintAddress: mintPda.toString(),
 agentAddress: agentPda.toString(),
 txId: signature,
 agent: {
 contractAddress: agentPda.toString(),
 mintAddress: mintPda.toString(),
 name: params.name,
 symbol: params.symbol,
 description: params.description,
 creator: publicKey.toBase58()
 }
 };

 } catch (error: any) {
 console.error(' On-chain agent creation failed:', error);
 setCreateError(error);
 throw error;
 } finally {
 setIsCreating(false);
 }
 }, [publicKey, signTransaction, sendTransaction, connection, creationFee]);

 /**
 * Buy tokens using bonding curve
 */
 const buyTokens = useCallback(async (
 agentAddress: string,
 solAmount: string,
 onSuccess?: (txHash: string) => void
 ) => {
 console.log(' Buying tokens:', { agentAddress, solAmount });

 if (!publicKey ||!signTransaction ||!sendTransaction) {
 throw new Error('Wallet not connected');
 }

 // Validate Solana address format and create PublicKey
 if (!agentAddress || agentAddress.length < 32 || agentAddress.length > 44) {
 const error = new Error(
 'This agent is not deployed on-chain yet. Please create a new agent using the "Create Agent" page, ' +
 'or wait for this agent to be deployed to Solana blockchain.'
 );
 setCreateError(error);
 throw error;
 }

 // Create PublicKey from agent address
 let agentPubkey: PublicKey;
 try {
 agentPubkey = new PublicKey(agentAddress);
 } catch (error) {
 const validationError = new Error(
 'Invalid agent address format. Please make sure the agent is properly deployed on Solana blockchain.'
 );
 setCreateError(validationError);
 throw validationError;
 }

 try {
 setIsCreating(true);
 setCreateError(null);

 // Create Anchor provider
 const provider = new AnchorProvider(
 connection,
 {
 publicKey,
 signTransaction,
 signAllTransactions: async (txs) => {
 if (!signTransaction) throw new Error('Wallet does not support signing');
 return Promise.all(txs.map(tx => signTransaction(tx)));
 }
 },
 { commitment: 'confirmed' }
 );

 // Initialize Anchor program
 const program = new Program(idl as any, PROGRAM_ID, provider);

 // Use the agentPubkey we already validated
 const agentPda = agentPubkey;

 // Derive mint PDA
 const [mintPda] = await PublicKey.findProgramAddress(
 [Buffer.from('mint'), agentPda.toBuffer()],
 PROGRAM_ID
 );

 // Get or create buyer's token account
 const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
 const buyerTokenAccount = await getAssociatedTokenAddress(
 mintPda,
 publicKey
 );

 // Check if token account exists
 const accountInfo = await connection.getAccountInfo(buyerTokenAccount);

 // Convert SOL amount to lamports
 const solAmountLamports = new BN(parseFloat(solAmount) * 1e9);
 const minTokensOut = new BN(0); // No slippage protection for now

 // Get agent account to find creator
 const agentAccount = await program.account.agent.fetch(agentPda);
 const creatorPubkey = agentAccount.creator as PublicKey;

 // Derive factory PDA
 const [factoryPda] = PublicKey.findProgramAddressSync(
 [Buffer.from('factory')],
 PROGRAM_ID
 );

 // Build transaction
 const tx = await program.methods
.buyTokens(solAmountLamports, minTokensOut)
.accounts({
 factory: factoryPda,
 agent: agentPda,
 mint: mintPda,
 buyerTokenAccount: buyerTokenAccount,
 buyer: publicKey,
 creator: creatorPubkey,
 platformTreasury: PLATFORM_TREASURY,
 tokenProgram: TOKEN_PROGRAM_ID,
 systemProgram: SystemProgram.programId,
 })
.transaction();

 // If token account doesn't exist, add instruction to create it
 if (!accountInfo) {
 const createAtaIx = createAssociatedTokenAccountInstruction(
 publicKey,
 buyerTokenAccount,
 publicKey,
 mintPda
 );
 tx.instructions.unshift(createAtaIx);
 }

 // Get fresh blockhash for proper confirmation strategy
 const { blockhash: buyBlockhash, lastValidBlockHeight: buyLastValid } = await connection.getLatestBlockhash('confirmed');
 tx.recentBlockhash = buyBlockhash;
 tx.feePayer = publicKey;

 // Send transaction
 console.log('Requesting wallet signature for buy...');
 const signature = await sendTransaction(tx, connection, {
 skipPreflight: false,
 maxRetries: 3,
 preflightCommitment: 'confirmed',
 });

 console.log('Buy transaction sent:', signature);

 // Wait for confirmation with extended timeout
 await confirmTransactionWithRetry(connection, signature, buyBlockhash, buyLastValid, 90_000);

 console.log('Buy transaction confirmed!');

 if (onSuccess) {
 onSuccess(signature);
 }

 return signature;

 } catch (error: any) {
 console.error(' Buy tokens failed:', error);
 setCreateError(error);
 throw error;
 } finally {
 setIsCreating(false);
 }
 }, [publicKey, signTransaction, sendTransaction, connection]);

 /**
 * Sell tokens using bonding curve
 */
 const sellTokens = useCallback(async (
 agentAddress: string,
 tokenAmount: string,
 onSuccess?: (txHash: string) => void
 ) => {
 console.log(' Selling tokens:', { agentAddress, tokenAmount });

 if (!publicKey ||!signTransaction ||!sendTransaction) {
 throw new Error('Wallet not connected');
 }

 // Validate Solana address format and create PublicKey
 if (!agentAddress || agentAddress.length < 32 || agentAddress.length > 44) {
 const error = new Error(
 'This agent is not deployed on-chain yet. Please create a new agent using the "Create Agent" page, ' +
 'or wait for this agent to be deployed to Solana blockchain.'
 );
 setCreateError(error);
 throw error;
 }

 // Create PublicKey from agent address
 let agentPubkey: PublicKey;
 try {
 agentPubkey = new PublicKey(agentAddress);
 } catch (error) {
 const validationError = new Error(
 'Invalid agent address format. Please make sure the agent is properly deployed on Solana blockchain.'
 );
 setCreateError(validationError);
 throw validationError;
 }

 try {
 setIsCreating(true);
 setCreateError(null);

 // Create Anchor provider
 const provider = new AnchorProvider(
 connection,
 {
 publicKey,
 signTransaction,
 signAllTransactions: async (txs) => {
 if (!signTransaction) throw new Error('Wallet does not support signing');
 return Promise.all(txs.map(tx => signTransaction(tx)));
 }
 },
 { commitment: 'confirmed' }
 );

 // Initialize Anchor program
 const program = new Program(idl as any, PROGRAM_ID, provider);

 // Use the agentPubkey we already validated
 const agentPda = agentPubkey;

 // Derive mint PDA
 const [mintPda] = await PublicKey.findProgramAddress(
 [Buffer.from('mint'), agentPda.toBuffer()],
 PROGRAM_ID
 );

 // Get seller's token account
 const { getAssociatedTokenAddress } = await import('@solana/spl-token');
 const sellerTokenAccount = await getAssociatedTokenAddress(
 mintPda,
 publicKey
 );

 // Convert token amount (assuming 9 decimals)
 const tokenAmountRaw = new BN(parseFloat(tokenAmount) * 1e9);
 const minSolOut = new BN(0); // No slippage protection for now

 // Get agent account to find creator
 const agentAccount = await program.account.agent.fetch(agentPda);
 const creatorPubkey = agentAccount.creator as PublicKey;

 // Derive factory PDA
 const [factoryPda] = PublicKey.findProgramAddressSync(
 [Buffer.from('factory')],
 PROGRAM_ID
 );

 // Build transaction
 const tx = await program.methods
.sellTokens(tokenAmountRaw, minSolOut)
.accounts({
 factory: factoryPda,
 agent: agentPda,
 mint: mintPda,
 sellerTokenAccount: sellerTokenAccount,
 seller: publicKey,
 creator: creatorPubkey,
 platformTreasury: PLATFORM_TREASURY,
 tokenProgram: TOKEN_PROGRAM_ID,
 systemProgram: SystemProgram.programId,
 })
.transaction();

 // Get fresh blockhash for proper confirmation strategy
 const { blockhash: sellBlockhash, lastValidBlockHeight: sellLastValid } = await connection.getLatestBlockhash('confirmed');
 tx.recentBlockhash = sellBlockhash;
 tx.feePayer = publicKey;

 // Send transaction
 console.log('Requesting wallet signature for sell...');
 const signature = await sendTransaction(tx, connection, {
 skipPreflight: false,
 maxRetries: 3,
 preflightCommitment: 'confirmed',
 });

 console.log('Sell transaction sent:', signature);

 // Wait for confirmation with extended timeout
 await confirmTransactionWithRetry(connection, signature, sellBlockhash, sellLastValid, 90_000);

 console.log('Sell transaction confirmed!');

 if (onSuccess) {
 onSuccess(signature);
 }

 return signature;

 } catch (error: any) {
 console.error(' Sell tokens failed:', error);
 setCreateError(error);
 throw error;
 } finally {
 setIsCreating(false);
 }
 }, [publicKey, signTransaction, sendTransaction, connection]);

 return {
 creationFee: getCreationFee(),
 isCreating,
 createError,
 createAgentToken,
 buyTokens,
 sellTokens,
 walletAddress: publicKey?.toBase58(),
 isWalletConnected:!!publicKey
 };
};
