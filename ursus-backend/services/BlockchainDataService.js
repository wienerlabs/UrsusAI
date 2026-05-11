const { Connection } = require('@solana/web3.js');
const { isValidAddress, formatLamports, parseSol, formatTokenAmount } = require('../utils/solana');
const Agent = require('../models/Agent');
const Trade = require('../models/Trade');

class BlockchainDataService {
 constructor() {
 this.connection = new Connection(
 process.env.SOLANA_RPC_URL || process.env.CORE_RPC_URL || 'https://api.mainnet-beta.solana.com'
 );
 this.PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || process.env.AGENT_FACTORY_ADDRESS || '';

 console.log('Blockchain Data Service initialized (Solana)');
 }

 // Get real-time data for an agent from blockchain
 // TODO: Fetch live Solana on-chain data via connection.getAccountInfo() and Anchor deserialization
 async updateAgentWithRealData(agentAddress) {
 try {
 console.log(`Fetching data for: ${agentAddress}`);

 // Validate address
 if (!isValidAddress(agentAddress)) {
 throw new Error('Invalid agent address');
 }

 // Get trade-based metrics from database
 const tradeMetrics = await this.calculateTradeMetrics(agentAddress);

 // Get current agent data from DB as baseline
 const agent = await Agent.findOne({
 $or: [
 { contractAddress: new RegExp(`^${agentAddress}$`, 'i') },
 { mintAddress: new RegExp(`^${agentAddress}$`, 'i') }
 ]
 });

 const blockchainData = {
 currentPrice: agent?.tokenomics?.currentPrice || '0',
 marketCap: agent?.tokenomics?.marketCap || '0',
 reserve: agent?.tokenomics?.reserve || '0',
 totalSupply: agent?.tokenomics?.totalSupply || '0',
 holders: agent?.metrics?.holders || 0,
...tradeMetrics
 };

 // Update agent in database
 await Agent.updateOne(
 {
 $or: [
 { contractAddress: agentAddress.toLowerCase() },
 { mintAddress: agentAddress.toLowerCase() }
 ]
 },
 {
 $set: {
 'metrics.volume24h': blockchainData.volume24h,
 'metrics.priceChange24h': blockchainData.priceChange24h,
 'metrics.allTimeHigh': blockchainData.allTimeHigh,
 'metrics.allTimeLow': blockchainData.allTimeLow,
 'metrics.totalTransactions': blockchainData.totalTrades,
 lastPriceUpdate: new Date()
 }
 }
 );

 console.log(`Data updated for ${agentAddress}`);

 return {
 success: true,
 agentAddress,
 data: blockchainData
 };

 } catch (error) {
 console.error(`Error fetching data for ${agentAddress}:`, error);
 return {
 success: false,
 agentAddress,
 error: error.message
 };
 }
 }

 // Calculate metrics from trade data
 async calculateTradeMetrics(agentAddress) {
 try {
 const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

 // Get recent trades
 const recentTrades = await Trade.find({
 agentAddress: agentAddress.toLowerCase(),
 timestamp: { $gte: twentyFourHoursAgo }
 }).sort({ timestamp: 1 });

 // Get all trades for price extremes
 const allTrades = await Trade.find({
 agentAddress: agentAddress.toLowerCase()
 }).sort({ timestamp: 1 });

 if (allTrades.length === 0) {
 return {
 volume24h: 0,
 priceChange24h: 0,
 allTimeHigh: '1.000000',
 allTimeLow: '1.000000',
 totalTrades: 0,
 uniqueTraders: 0,
 avgTradeSize: 0
 };
 }

 // Calculate 24h volume
 const volume24h = recentTrades.reduce((sum, trade) => {
 return sum + parseFloat(trade.coreAmount);
 }, 0);

 // Calculate price change
 const latestTrade = allTrades[allTrades.length - 1];
 const oldestTrade24h = recentTrades.length > 0? recentTrades[0]: latestTrade;
 const priceChange24h = latestTrade.price - oldestTrade24h.price;

 // Calculate price extremes
 const prices = allTrades.map(t => t.price);
 const allTimeHigh = Math.max(...prices);
 const allTimeLow = Math.min(...prices);

 // Calculate unique traders
 const uniqueTraders = new Set(allTrades.map(t => t.trader)).size;

 // Calculate average trade size
 const totalVolume = allTrades.reduce((sum, t) => sum + parseFloat(t.coreAmount), 0);
 const avgTradeSize = allTrades.length > 0? totalVolume / allTrades.length: 0;

 return {
 volume24h,
 priceChange24h,
 allTimeHigh: allTimeHigh.toFixed(6),
 allTimeLow: allTimeLow.toFixed(6),
 totalTrades: allTrades.length,
 uniqueTraders,
 avgTradeSize
 };

 } catch (error) {
 console.error(' Error calculating trade metrics:', error);
 return {
 volume24h: 0,
 priceChange24h: 0,
 allTimeHigh: '1.000000',
 allTimeLow: '1.000000',
 totalTrades: 0,
 uniqueTraders: 0,
 avgTradeSize: 0
 };
 }
 }

 // Get trading quote from database-based bonding curve
 // TODO: For live on-chain quotes, interact with Solana program via Anchor
 async getBuyQuote(agentAddress, solAmount) {
 try {
 const agent = await Agent.findOne({
 $or: [
 { contractAddress: new RegExp(`^${agentAddress}$`, 'i') },
 { mintAddress: new RegExp(`^${agentAddress}$`, 'i') }
 ]
 });

 if (!agent) {
 return { success: false, error: 'Agent not found' };
 }

 const currentPrice = parseFloat(agent.tokenomics?.currentPrice || '0');
 const marketCap = agent.tokenomics?.marketCap || '0';
 const numSolAmount = parseFloat(solAmount);
 const tokensReceived = currentPrice > 0? numSolAmount / currentPrice: 0;

 return {
 success: true,
 tokensReceived: tokensReceived.toString(),
 currentPrice: currentPrice.toString(),
 marketCap,
 priceImpact: this.calculatePriceImpact(solAmount, tokensReceived.toString())
 };

 } catch (error) {
 console.error('Error getting buy quote:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Get sell quote from database-based bonding curve
 // TODO: For live on-chain quotes, interact with Solana program via Anchor
 async getSellQuote(agentAddress, tokenAmount) {
 try {
 const agent = await Agent.findOne({
 $or: [
 { contractAddress: new RegExp(`^${agentAddress}$`, 'i') },
 { mintAddress: new RegExp(`^${agentAddress}$`, 'i') }
 ]
 });

 if (!agent) {
 return { success: false, error: 'Agent not found' };
 }

 const currentPrice = parseFloat(agent.tokenomics?.currentPrice || '0');
 const marketCap = agent.tokenomics?.marketCap || '0';
 const numTokenAmount = parseFloat(tokenAmount);
 const solReceived = numTokenAmount * currentPrice;

 return {
 success: true,
 coreReceived: solReceived.toString(),
 currentPrice: currentPrice.toString(),
 marketCap,
 priceImpact: this.calculatePriceImpact(solReceived.toString(), tokenAmount)
 };

 } catch (error) {
 console.error('Error getting sell quote:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Calculate price impact
 calculatePriceImpact(coreAmount, tokenAmount) {
 try {
 const price = parseFloat(coreAmount) / parseFloat(tokenAmount);
 // This is a simplified calculation - in reality, you'd compare with current market price
 return Math.min(price * 0.01, 5.0); // Max 5% impact
 } catch (error) {
 return 0;
 }
 }

 // Get all agents from database (Solana programs don't have a direct getAllAgents equivalent)
 // TODO: Implement Solana program account scanning via connection.getProgramAccounts()
 async getAllAgentsFromBlockchain() {
 try {
 const agents = await Agent.find({ isActive: true }).select('contractAddress mintAddress').lean();
 const addresses = agents.map(a => a.mintAddress || a.contractAddress).filter(Boolean);
 console.log(`Found ${addresses.length} agents in database`);
 return addresses;
 } catch (error) {
 console.error('Error getting agents:', error);
 return [];
 }
 }

 // Get Solana network information
 async getNetworkInfo() {
 try {
 const [slot, recentFees] = await Promise.all([
 this.connection.getSlot(),
 this.connection.getRecentPrioritizationFees().catch(() => [])
 ]);

 const avgFee = recentFees.length > 0
? recentFees.reduce((sum, f) => sum + f.prioritizationFee, 0) / recentFees.length
: 0;

 return {
 network: 'solana',
 slot,
 avgPrioritizationFee: formatTokenAmount(Math.round(avgFee), 9)
 };

 } catch (error) {
 console.error('Error getting network info:', error);
 throw error;
 }
 }
}

module.exports = BlockchainDataService;
