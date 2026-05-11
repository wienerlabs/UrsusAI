const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const PriceHistory = require('../models/PriceHistory');
const { PublicKey } = require('@solana/web3.js');

// Database connection
const connectDB = async () => {
 try {
 await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ursus', {
 useNewUrlParser: true,
 useUnifiedTopology: true,
 });
 console.log(' MongoDB connected for cleanup');
 } catch (error) {
 console.error(' MongoDB connection error:', error);
 process.exit(1);
 }
};

// Validate Solana address (base58, 32-44 characters)
const isValidSolanaAddress = (address) => {
 try {
 if (!address || address.length < 32 || address.length > 44) return false;
 new PublicKey(address);
 return true;
 } catch (error) {
 return false;
 }
};

// Clean up invalid agents and related data
const cleanupInvalidAgents = async () => {
 try {
 console.log(' Starting cleanup of invalid agents...');

 // Find all agents
 const allAgents = await Agent.find({});
 console.log(` Found ${allAgents.length} total agents`);

 const invalidAgents = [];
 const validAgents = [];

 // Check each agent's contract address
 for (const agent of allAgents) {
 const isValid = isValidSolanaAddress(agent.contractAddress);

 if (!isValid) {
 console.log(` Invalid agent found: ${agent.name} (${agent.contractAddress})`);
 invalidAgents.push(agent);
 } else {
 console.log(` Valid agent: ${agent.name} (${agent.contractAddress})`);
 validAgents.push(agent);
 }
 }

 console.log(`\n Cleanup Summary:`);
 console.log(` Valid agents: ${validAgents.length}`);
 console.log(` Invalid agents: ${invalidAgents.length}`);

 if (invalidAgents.length === 0) {
 console.log(' No invalid agents found. Database is clean!');
 return;
 }

 // Get confirmation before deletion
 console.log('\n The following agents will be deleted:');
 invalidAgents.forEach(agent => {
 console.log(` - ${agent.name} (${agent.contractAddress})`);
 });

 // In production, you might want to add a confirmation prompt here
 // For now, we'll proceed with cleanup

 console.log('\n Starting deletion process...');

 let deletedCount = 0;
 let errorCount = 0;

 for (const agent of invalidAgents) {
 try {
 console.log(` Deleting agent: ${agent.name} (${agent.contractAddress})`);

 // Delete related data first
 const agentAddress = agent.contractAddress.toLowerCase();

 // Delete trades
 const tradesDeleted = await Trade.deleteMany({
 agentAddress: agentAddress
 });
 console.log(` Deleted ${tradesDeleted.deletedCount} trades`);

 // Delete portfolio entries
 const portfolioDeleted = await Portfolio.deleteMany({
 agentAddress: agentAddress
 });
 console.log(` Deleted ${portfolioDeleted.deletedCount} portfolio entries`);

 // Delete price history
 const priceHistoryDeleted = await PriceHistory.deleteMany({
 agentAddress: agentAddress
 });
 console.log(` Deleted ${priceHistoryDeleted.deletedCount} price history entries`);

 // Finally delete the agent
 await Agent.deleteOne({ _id: agent._id });
 console.log(` Deleted agent: ${agent.name}`);

 deletedCount++;

 } catch (error) {
 console.error(` Error deleting agent ${agent.name}:`, error.message);
 errorCount++;
 }
 }

 console.log(`\n Cleanup completed!`);
 console.log(` Successfully deleted: ${deletedCount} agents`);
 console.log(` Errors: ${errorCount}`);

 // Verify remaining agents
 const remainingAgents = await Agent.find({});
 console.log(` Remaining agents in database: ${remainingAgents.length}`);

 remainingAgents.forEach(agent => {
 console.log(` ${agent.name} (${agent.contractAddress})`);
 });

 } catch (error) {
 console.error(' Cleanup error:', error);
 }
};

// Add specific agent validation
const validateSpecificAgent = async (contractAddress) => {
 try {
 const agent = await Agent.findOne({
 contractAddress: contractAddress.toLowerCase()
 });

 if (!agent) {
 console.log(` Agent not found: ${contractAddress}`);
 return false;
 }

 const isValid = isValidSolanaAddress(agent.contractAddress);
 console.log(`Agent: ${agent.name}`);
 console.log(`Address: ${agent.contractAddress}`);
 console.log(`Valid: ${isValid? '': ''}`);

 return isValid;
 } catch (error) {
 console.error(' Validation error:', error);
 return false;
 }
};

// Main execution
const main = async () => {
 await connectDB();

 const args = process.argv.slice(2);

 if (args.length > 0) {
 // Validate specific agent
 const contractAddress = args[0];
 console.log(` Validating specific agent: ${contractAddress}`);
 await validateSpecificAgent(contractAddress);
 } else {
 // Full cleanup
 await cleanupInvalidAgents();
 }

 await mongoose.connection.close();
 console.log(' Database connection closed');
 process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (error) => {
 console.error(' Unhandled rejection:', error);
 process.exit(1);
});

process.on('uncaughtException', (error) => {
 console.error(' Uncaught exception:', error);
 process.exit(1);
});

// Run the script
if (require.main === module) {
 main();
}

module.exports = {
 cleanupInvalidAgents,
 validateSpecificAgent,
 isValidSolanaAddress
};
