import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/agent_factory.json";

async function main() {
 // Configure the client to use testnet
 const provider = anchor.AnchorProvider.env();
 anchor.setProvider(provider);

 const programId = new PublicKey("4m6mpe2jdRiM24ui1Z3AGbCheu1DfQEjmEGtaGKD2ftU");
 const program = new Program(idl as any, programId, provider);

 console.log(" Initializing Agent Factory...");
 console.log(" Program ID:", programId.toString());
 console.log(" Authority:", provider.wallet.publicKey.toString());

 // Derive factory PDA
 const [factoryPda, factoryBump] = await PublicKey.findProgramAddress(
 [Buffer.from("factory")],
 programId
 );

 console.log(" Factory PDA:", factoryPda.toString());

 // Platform treasury (same as authority for now)
 const platformTreasury = provider.wallet.publicKey;

 // Creation fee: 0.1 SOL
 const creationFee = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

 try {
 // Check if factory already exists
 try {
 const factoryAccount: any = await program.account.agentFactory.fetch(factoryPda);
 console.log(" Factory already initialized!");
 console.log(" Total Agents:", factoryAccount.totalAgents.toString());
 console.log(" Creation Fee:", factoryAccount.creationFee.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
 return;
 } catch (e) {
 // Factory doesn't exist, continue with initialization
 console.log(" Factory not found, initializing...");
 }

 // Initialize factory
 const tx = await program.methods
.initialize(creationFee)
.accounts({
 factory: factoryPda,
 authority: provider.wallet.publicKey,
 platformTreasury: platformTreasury,
 systemProgram: SystemProgram.programId,
 })
.rpc();

 console.log(" Factory initialized successfully!");
 console.log(" Transaction signature:", tx);
 console.log(" View on Solana Explorer:");
 console.log(` https://explorer.solana.com/tx/${tx}?cluster=testnet`);

 // Fetch and display factory state
 const factoryAccount: any = await program.account.agentFactory.fetch(factoryPda);
 console.log("\n Factory State:");
 console.log(" Authority:", factoryAccount.authority.toString());
 console.log(" Platform Treasury:", factoryAccount.platformTreasury.toString());
 console.log(" Total Agents:", factoryAccount.totalAgents.toString());
 console.log(" Creation Fee:", factoryAccount.creationFee.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");

 } catch (error) {
 console.error(" Error initializing factory:", error);
 throw error;
 }
}

main()
.then(() => {
 console.log("\n Script completed successfully");
 process.exit(0);
 })
.catch((error) => {
 console.error("\n Script failed:", error);
 process.exit(1);
 });

