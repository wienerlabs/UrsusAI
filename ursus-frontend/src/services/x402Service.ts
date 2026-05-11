import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { SOLANA_PROGRAM_ADDRESSES } from '../config/contracts';
import idl from '../idl/agent_factory.json';

// Circle's official devnet USDC mint (6 decimals)
// https://developers.circle.com/stablecoins/usdc-on-test-networks
const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
import type { 
  ConfigureX402Params, 
  PayForServiceParams, 
  CallAgentServiceParams,
  X402Config,
  X402PaymentRecord 
} from '../types/x402';

export class X402Service {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, network: 'TESTNET' | 'DEVNET' | 'MAINNET' = 'DEVNET') {
    this.connection = connection;
    this.programId = new PublicKey(SOLANA_PROGRAM_ADDRESSES[network].PROGRAM_ID);
  }

  // Create a fresh Program instance each call to avoid stale provider / cached state
  private getProgram(provider: AnchorProvider): Program {
    return new Program(idl as any, this.programId, provider);
  }

  async getX402ConfigPDA(agentAddress: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('x402_config'), agentAddress.toBuffer()],
      this.programId
    );
  }

  async getPaymentRecordPDA(
    agentAddress: PublicKey,
    payerAddress: PublicKey,
    nonce: number
  ): Promise<[PublicKey, number]> {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('payment_record'), agentAddress.toBuffer(), payerAddress.toBuffer(), nonceBuffer],
      this.programId
    );
  }

  /**
   * Ensure USDC token account exists for a wallet, create if needed
   */
  private async ensureTokenAccount(
    owner: PublicKey,
    provider: AnchorProvider
  ): Promise<PublicKey> {
    const tokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      owner
    );

    // Check if account exists
    const accountInfo = await this.connection.getAccountInfo(tokenAccount);

    if (!accountInfo) {
      // Create the token account
      const instruction = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey, // payer
        tokenAccount, // ata
        owner, // owner
        USDC_MINT_DEVNET // mint
      );

      const transaction = new Transaction().add(instruction);
      const signature = await provider.sendAndConfirm(transaction);
      console.log('Created token account:', tokenAccount.toBase58(), 'signature:', signature);
    }

    return tokenAccount;
  }

  async configureX402(params: ConfigureX402Params, provider: AnchorProvider): Promise<string> {
    const program = this.getProgram(provider);
    const agentPubkey = new PublicKey(params.agentAddress);
    const [x402ConfigPDA] = await this.getX402ConfigPDA(agentPubkey);

    // Fetch with 'confirmed' commitment to avoid stale state
    const accountInfo = await this.connection.getAccountInfo(x402ConfigPDA, 'confirmed');

    let ix;
    if (accountInfo) {
      // Account already exists → use updateX402
      ix = await program.methods
        .updateX402(
          params.enabled,
          new BN(params.minPaymentAmount),
          new BN(params.maxPaymentAmount),
          new BN(params.serviceTimeoutSeconds)
        )
        .accounts({
          agent: agentPubkey,
          x402Config: x402ConfigPDA,
          authority: provider.wallet.publicKey,
        })
        .instruction();
    } else {
      // Account doesn't exist → initialize with configureX402
      ix = await program.methods
        .configureX402(
          params.enabled,
          new BN(params.minPaymentAmount),
          new BN(params.maxPaymentAmount),
          new BN(params.serviceTimeoutSeconds)
        )
        .accounts({
          agent: agentPubkey,
          x402Config: x402ConfigPDA,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const tx = new Transaction();
    tx.add(ix);
    tx.recentBlockhash = blockhash;
    tx.feePayer = provider.wallet.publicKey;

    const signedTx = await provider.wallet.signTransaction(tx);

    try {
      const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 0,
      });

      await this.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return signature;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('already been processed') || msg.includes('already processed')) {
        throw new Error(
          'This configuration change was already processed. Please refresh the page.'
        );
      }
      throw err;
    }
  }

  async payForService(params: PayForServiceParams, provider: AnchorProvider): Promise<string> {
    const program = this.getProgram(provider);
    const agentPubkey = new PublicKey(params.agentAddress);
    const [x402ConfigPDA] = await this.getX402ConfigPDA(agentPubkey);

    // Fetch the latest x402 config with 'confirmed' commitment to get the most recent nonce
    const freshConfigInfo = await this.connection.getAccountInfo(x402ConfigPDA, 'confirmed');
    if (!freshConfigInfo) {
      throw new Error('X402 config not found on-chain. Configure x402 for this agent first.');
    }
    const config = this.decodeX402Config(freshConfigInfo.data);
    const nextNonce = config.nonce + 1;

    const [paymentRecordPDA] = await this.getPaymentRecordPDA(
      agentPubkey,
      provider.wallet.publicKey,
      nextNonce
    );

    // Defensive: if a payment record with this nonce already exists, bump further
    // This prevents "account already in use" if on-chain state is ahead of cache
    let finalNonce = nextNonce;
    let finalPaymentRecordPDA = paymentRecordPDA;
    const existingRecord = await this.connection.getAccountInfo(paymentRecordPDA, 'confirmed');
    if (existingRecord) {
      // The nonce we calculated is already used — refetch config and try again
      const retryInfo = await this.connection.getAccountInfo(x402ConfigPDA, 'confirmed');
      if (retryInfo) {
        const retryConfig = this.decodeX402Config(retryInfo.data);
        finalNonce = retryConfig.nonce + 1;
        [finalPaymentRecordPDA] = await this.getPaymentRecordPDA(
          agentPubkey,
          provider.wallet.publicKey,
          finalNonce
        );
      }
    }

    // Ensure USDC token accounts exist (create if needed)
    const payerTokenAccount = await this.ensureTokenAccount(
      provider.wallet.publicKey,
      provider
    );

    const recipientTokenAccount = await this.ensureTokenAccount(
      config.paymentRecipient || agentPubkey,
      provider
    );

    // Build instruction, then manually assemble/send transaction to avoid
    // Anchor's internal retry that can cause "already processed" errors.
    const ix = await program.methods
      .payForService(
        new BN(params.amount),
        params.serviceId,
        new BN(finalNonce)
      )
      .accounts({
        agent: agentPubkey,
        x402Config: x402ConfigPDA,
        paymentRecord: finalPaymentRecordPDA,
        payer: provider.wallet.publicKey,
        payerTokenAccount,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const tx = new Transaction();
    tx.add(ix);
    tx.recentBlockhash = blockhash;
    tx.feePayer = provider.wallet.publicKey;

    // Sign with the wallet (Phantom)
    const signedTx = await provider.wallet.signTransaction(tx);

    try {
      // Send with skipPreflight to avoid "already processed" simulation errors
      // when the tx is already in the leader's pool from a previous attempt
      const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 0,
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return signature;
    } catch (err: any) {
      // If the error says "already processed", the transaction actually succeeded
      // earlier — we just couldn't resubmit it. Treat as success by returning
      // a meaningful signature (the most recent record signature is hard to get,
      // so we bubble up a clear message and let the caller refetch config).
      const msg = err?.message || String(err);
      if (msg.includes('already been processed') || msg.includes('already processed')) {
        throw new Error(
          'This payment was already processed. The on-chain state may have updated; please refresh and try again.'
        );
      }
      throw err;
    }
  }

  async getX402Config(agentAddress: string): Promise<X402Config | null> {
    try {
      const agentPubkey = new PublicKey(agentAddress);
      const [x402ConfigPDA] = await this.getX402ConfigPDA(agentPubkey);
      const accountInfo = await this.connection.getAccountInfo(x402ConfigPDA);
      if (!accountInfo) return null;
      return this.decodeX402Config(accountInfo.data);
    } catch (error) {
      console.error('Error fetching X402 config:', error);
      return null;
    }
  }

  private decodeX402Config(data: Buffer): X402Config {
    let offset = 8;
    return {
      agent: new PublicKey(data.slice(offset, offset + 32)),
      paymentRecipient: new PublicKey(data.slice(offset + 32, offset + 64)),
      enabled: data.readUInt8(offset + 64) === 1,
      minPaymentAmount: Number(data.readBigUInt64LE(offset + 65)),
      maxPaymentAmount: Number(data.readBigUInt64LE(offset + 73)),
      serviceTimeoutSeconds: Number(data.readBigUInt64LE(offset + 81)),
      totalPaymentsReceived: Number(data.readBigUInt64LE(offset + 89)),
      totalServiceCalls: Number(data.readBigUInt64LE(offset + 97)),
      nonce: Number(data.readBigUInt64LE(offset + 105)),
      bump: data.readUInt8(offset + 113),
    };
  }

  private decodePaymentRecord(data: Buffer): X402PaymentRecord {
    let offset = 8;
    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const payer = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const amount = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const timestamp = Number(data.readBigInt64LE(offset));
    offset += 8;
    const serviceIdLen = data.readUInt32LE(offset);
    offset += 4;
    const serviceId = data.slice(offset, offset + serviceIdLen).toString('utf-8');
    offset += serviceIdLen;
    const status = data.readUInt8(offset);
    offset += 1;
    const bump = data.readUInt8(offset);
    return { agent, payer, amount, timestamp, serviceId, status, bump };
  }
}
