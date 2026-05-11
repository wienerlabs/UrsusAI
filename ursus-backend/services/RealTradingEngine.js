/**
 * DEPRECATED: This service is for EVM/Ethereum-based trading
 *
 * For Solana trading, use SolanaBlockchainService instead:
 * - SolanaBlockchainService.buyTokens() for buy transactions
 * - SolanaBlockchainService.sellTokens() for sell transactions
 *
 * This file is kept for reference and backward compatibility only.
 * All new trading functionality should use SolanaBlockchainService.
 */

const { isValidAddress, formatLamports, parseSol, formatTokenAmount } = require('../utils/solana');
const Agent = require('../models/Agent');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const BlockchainDataService = require('./BlockchainDataService');

// TODO: Implement Solana SPL token transfer parsing from transaction logs
// using @solana/web3.js ParsedTransactionWithMeta and token program instructions.

// TODO: Implement Solana SPL token decimals lookup via getMint() from @solana/spl-token
async function getTokenDecimals(connection, tokenAddress) {
 // Default to 9 decimals (standard for Solana SPL tokens)
 return 9;
}

// TODO: Replace with Solana transaction log parsing for SPL token transfers
function parseTokenTransfersFromTransaction(parsedTx, tokenAddress, userAddress) {
 // Placeholder: On Solana, parse innerInstructions and tokenBalances from
 // getParsedTransaction() to extract SPL token transfer amounts.
 return { toUser: 0, fromUser: 0 };
}

class RealTradingEngine {
 constructor(databaseService, websocketService) {
 this.databaseService = databaseService;
 this.websocketService = websocketService;
 this.blockchainService = new BlockchainDataService();
 this.connection = this.blockchainService.connection;

 // Trading configuration
 this.config = {
 maxSlippage: 0.05, // 5% max slippage
 minTradeAmount: 0.001, // Minimum 0.001 SOL
 // maxTradeAmount removed - users can trade any amount
 maxPriorityFee: parseSol('0.001'), // Max priority fee in lamports
 tradingFee: 0.003 // 0.3% trading fee
 };

 console.log('DEPRECATED: RealTradingEngine initialized. Use SolanaBlockchainService for Solana trading.');
 }

 // Execute a buy order
 // TODO: Delegate to SolanaBlockchainService.buyTokens() for actual on-chain execution
 async executeBuyOrder(userAddress, agentAddress, solAmount, options = {}) {
 try {
 console.log(`Executing buy order: ${solAmount} SOL for ${agentAddress}`);

 const validation = await this.validateTradeInputs(userAddress, agentAddress, solAmount, 'buy');
 if (!validation.isValid) throw new Error(validation.error);

 const quote = await this.blockchainService.getBuyQuote(agentAddress, solAmount);
 if (!quote.success) throw new Error(`Failed to get buy quote: ${quote.error}`);

 const slippage = this.calculateSlippage(quote.priceImpact);
 if (slippage > this.config.maxSlippage) {
 throw new Error(`Slippage too high: ${(slippage * 100).toFixed(2)}%`);
 }

 // Frontend signs and sends the tx; we prepare the data
 const txData = await this.prepareBuyTransaction(userAddress, agentAddress, solAmount, quote, options);

 // Execute transaction: expects txHash from frontend
 const result = await this.executeTransaction(txData, options);

 if (options.returnTxOnly) {
 return { success: true, action: 'SIGN_AND_SEND', txData, quote };
 }

 if (!result.success) throw new Error(result.error);

 // TODO: Parse Solana transaction for actual token amounts using getParsedTransaction()
 const decimals = await getTokenDecimals(this.connection, agentAddress);
 const solIn = Number(solAmount);
 const tokensReceivedHuman = parseFloat(quote.tokensReceived || '0');
 const effectivePrice = tokensReceivedHuman > 0? solIn / tokensReceivedHuman: Number(quote.currentPrice);

 await this.processSuccessfulTrade({
 type: 'buy',
 userAddress,
 agentAddress,
 coreAmount: solIn,
 tokenAmount: tokensReceivedHuman,
 price: effectivePrice,
 transactionHash: result.transactionHash,
 gasUsed: result.gasUsed,
 gasPrice: result.gasPrice,
 slippage,
 fee: solIn * this.config.tradingFee,
 blockNumber: result.blockNumber
 });

 return {
 success: true,
 transactionHash: result.transactionHash,
 tokensReceived: tokensReceivedHuman,
 price: effectivePrice,
 slippage,
 gasUsed: result.gasUsed,
 totalCost: solIn + (solIn * this.config.tradingFee)
 };

 } catch (error) {
 console.error('Buy order failed:', error);
 await this.logFailedTrade({ type: 'buy', userAddress, agentAddress, solAmount, error: error.message, timestamp: new Date() });
 throw error;
 }
 }


 // TODO: Delegate to SolanaBlockchainService.sellTokens() for actual on-chain execution
 async executeSellOrder(userAddress, agentAddress, tokenAmount, options = {}) {
 try {
 console.log(`Executing sell order: ${tokenAmount} tokens for ${agentAddress}`);

 const validation = await this.validateTradeInputs(userAddress, agentAddress, tokenAmount, 'sell');
 if (!validation.isValid) throw new Error(validation.error);

 const quote = await this.blockchainService.getSellQuote(agentAddress, tokenAmount);
 if (!quote.success) throw new Error(`Failed to get sell quote: ${quote.error}`);

 const slippage = this.calculateSlippage(quote.priceImpact);
 if (slippage > this.config.maxSlippage) {
 throw new Error(`Slippage too high: ${(slippage * 100).toFixed(2)}%`);
 }

 const txData = await this.prepareSellTransaction(userAddress, agentAddress, tokenAmount, quote, options);
 const result = await this.executeTransaction(txData, options);
 if (!result.success) throw new Error(result.error);

 // TODO: Parse Solana transaction for actual token/SOL amounts using getParsedTransaction()
 const tokensSoldHuman = Number(tokenAmount);
 const solOut = Number(quote.coreReceived || (tokensSoldHuman * Number(quote.currentPrice)));
 const effectivePrice = tokensSoldHuman > 0? solOut / tokensSoldHuman: Number(quote.currentPrice);

 await this.processSuccessfulTrade({
 type: 'sell',
 userAddress,
 agentAddress,
 coreAmount: solOut,
 tokenAmount: tokensSoldHuman,
 price: effectivePrice,
 transactionHash: result.transactionHash,
 gasUsed: result.gasUsed,
 gasPrice: result.gasPrice,
 slippage,
 fee: solOut * this.config.tradingFee,
 blockNumber: result.blockNumber
 });

 return {
 success: true,
 transactionHash: result.transactionHash,
 coreReceived: solOut,
 price: effectivePrice,
 slippage,
 gasUsed: result.gasUsed,
 netReceived: solOut - (solOut * this.config.tradingFee)
 };

 } catch (error) {
 console.error('Sell order failed:', error);
 await this.logFailedTrade({ type: 'sell', userAddress, agentAddress, tokenAmount, error: error.message, timestamp: new Date() });
 throw error;
 }
 }


 // Validate trade inputs
 async validateTradeInputs(userAddress, agentAddress, amount, type) {
 try {
 // Validate addresses (Solana)
 if (!isValidAddress(userAddress)) {
 return { isValid: false, error: 'Invalid user address' };
 }

 if (!isValidAddress(agentAddress)) {
 return { isValid: false, error: 'Invalid agent address' };
 }

 // Validate amount
 const numAmount = parseFloat(amount);
 if (isNaN(numAmount) || numAmount <= 0) {
 return { isValid: false, error: 'Invalid amount' };
 }

 // Check amount limits
 if (type === 'buy') {
 if (numAmount < this.config.minTradeAmount) {
 return { isValid: false, error: `Minimum trade amount is ${this.config.minTradeAmount} CORE` };
 }

 // Maximum trade amount limit removed - users can trade any amount
 }

 // Check if agent exists and is active
 const agent = await Agent.findOne({
 contractAddress: agentAddress.toLowerCase(),
 isActive: true
 });

 if (!agent) {
 return { isValid: false, error: 'Agent not found or inactive' };
 }

 // Check if user exists
 let user = await User.findOne({ walletAddress: userAddress.toLowerCase() });
 if (!user) {
 // Create user if doesn't exist
 user = new User({
 walletAddress: userAddress.toLowerCase(),
 username: null,
 email: null
 });
 await user.save();
 }

 return { isValid: true, agent, user };

 } catch (error) {
 console.error(' Trade validation error:', error);
 return { isValid: false, error: 'Validation failed' };
 }
 }

 // Calculate slippage
 calculateSlippage(priceImpact) {
 return Math.abs(priceImpact) / 100; // Convert percentage to decimal
 }

 /**
 * DEPRECATED: EVM-based transaction preparation
 *
 * For Solana, use SolanaBlockchainService.buyTokens() instead.
 * Solana transactions are prepared using Anchor framework:
 *
 * Example:
 * const solanaService = new SolanaBlockchainService();
 * const result = await solanaService.buyTokens({
 * agentAddress: 'agent_pubkey',
 * solAmount: '0.1',
 * minTokensOut: '0',
 * buyerPublicKey: 'buyer_pubkey'
 * });
 */
 async prepareBuyTransaction(userAddress, agentAddress, coreAmount, quote, options) {
 console.warn(' prepareBuyTransaction is deprecated for Solana. Use SolanaBlockchainService.buyTokens() instead.');
 throw new Error('EVM-based trading is deprecated. Use SolanaBlockchainService for Solana trading.');
 }

 /**
 * DEPRECATED: EVM-based transaction preparation
 *
 * For Solana, use SolanaBlockchainService.sellTokens() instead.
 * Solana transactions are prepared using Anchor framework:
 *
 * Example:
 * const solanaService = new SolanaBlockchainService();
 * const result = await solanaService.sellTokens({
 * agentAddress: 'agent_pubkey',
 * tokenAmount: '1000',
 * minSolOut: '0',
 * sellerPublicKey: 'seller_pubkey'
 * });
 */
 async prepareSellTransaction(userAddress, agentAddress, tokenAmount, quote, options) {
 console.warn(' prepareSellTransaction is deprecated for Solana. Use SolanaBlockchainService.sellTokens() instead.');
 throw new Error('EVM-based trading is deprecated. Use SolanaBlockchainService for Solana trading.');
 }

 // Execute transaction (expects txHash or serialized tx from frontend)
 // TODO: Use connection.sendRawTransaction() for serialized Solana transactions
 async executeTransaction(txData, options = {}) {
 try {
 // 1) Frontend sent a serialized Solana transaction
 if (options.signedTx) {
 const txBuffer = Buffer.from(options.signedTx, 'base64');
 const txHash = await this.connection.sendRawTransaction(txBuffer);
 const confirmation = await this.connection.confirmTransaction(txHash, 'confirmed');
 if (confirmation.value.err) {
 throw new Error('Transaction failed on-chain');
 }
 return {
 success: true,
 transactionHash: txHash,
 gasUsed: '0',
 gasPrice: '0',
 blockNumber: 0,
 receipt: confirmation
 };
 }

 // 2) Frontend sent the transaction and provided the txHash (signature)
 if (options.txHash) {
 const confirmation = await this.connection.confirmTransaction(options.txHash, 'confirmed');
 if (confirmation.value.err) {
 throw new Error('Transaction failed or not found');
 }
 return {
 success: true,
 transactionHash: options.txHash,
 gasUsed: '0',
 gasPrice: '0',
 blockNumber: 0,
 receipt: confirmation
 };
 }

 // Backend does not sign transactions
 throw new Error('No signedTx or txHash provided. Backend does not sign transactions.');
 } catch (error) {
 return { success: false, error: error.message };
 }
 }


 // Process successful trade
 async processSuccessfulTrade(tradeData) {
 try {
 // Create trade record
 const trade = new Trade({
 agentAddress: tradeData.agentAddress.toLowerCase(),
 transactionHash: tradeData.transactionHash,
 blockNumber: tradeData.blockNumber || 0,
 timestamp: new Date(),
 trader: tradeData.userAddress.toLowerCase(),
 type: tradeData.type,
 coreAmount: tradeData.coreAmount.toString(),
 tokenAmount: tradeData.tokenAmount.toString(),
 price: tradeData.price,
 priceUsd: tradeData.price, // Assuming CORE = USD for now
 gasUsed: tradeData.gasUsed || 0,
 gasPrice: tradeData.gasPrice || '0',
 slippage: tradeData.slippage || 0,
 fee: tradeData.fee || 0
 });

 await trade.save();

 // Update user portfolio
 await this.updateUserPortfolio(tradeData);

 // Update agent metrics
 await this.updateAgentMetrics(tradeData.agentAddress);

 // Broadcast real-time update
 this.broadcastTradeUpdate(tradeData);

 // Clear relevant caches
 await this.clearTradingCaches(tradeData.agentAddress);

 console.log(` Trade processed successfully: ${tradeData.transactionHash}`);

 } catch (error) {
 console.error(' Error processing successful trade:', error);
 throw error;
 }
 }

 // Update user portfolio
 async updateUserPortfolio(tradeData) {
 try {
 // Find or create portfolio
 let portfolio = await Portfolio.findOne({
 userAddress: tradeData.userAddress.toLowerCase(),
 agentAddress: tradeData.agentAddress.toLowerCase()
 });

 if (!portfolio) {
 const agent = await Agent.findOne({
 contractAddress: tradeData.agentAddress.toLowerCase()
 });

 const user = await User.findOne({
 walletAddress: tradeData.userAddress.toLowerCase()
 });

 portfolio = new Portfolio({
 user: user._id,
 userAddress: tradeData.userAddress.toLowerCase(),
 agent: agent._id,
 agentAddress: tradeData.agentAddress.toLowerCase()
 });
 }

 // Update portfolio based on trade type
 if (tradeData.type === 'buy') {
 const currentBalance = parseFloat(portfolio.balance);
 const currentInvested = parseFloat(portfolio.totalInvested);
 const tokenAmount = parseFloat(tradeData.tokenAmount);
 const coreAmount = parseFloat(tradeData.coreAmount);

 const newBalance = currentBalance + tokenAmount;
 const newInvested = currentInvested + coreAmount;
 const newAvgPrice = newInvested / newBalance;

 portfolio.balance = newBalance.toString();
 portfolio.totalInvested = newInvested.toString();
 portfolio.averageBuyPrice = newAvgPrice.toString();

 } else { // sell
 const currentBalance = parseFloat(portfolio.balance);
 const currentInvested = parseFloat(portfolio.totalInvested);
 const tokenAmount = parseFloat(tradeData.tokenAmount);
 const coreReceived = parseFloat(tradeData.coreAmount);

 const newBalance = Math.max(0, currentBalance - tokenAmount);
 const sellRatio = tokenAmount / currentBalance;
 const newInvested = currentInvested * (1 - sellRatio);

 portfolio.balance = newBalance.toString();
 portfolio.totalInvested = newInvested.toString();

 // Calculate realized P&L
 const costBasis = parseFloat(portfolio.averageBuyPrice) * tokenAmount;
 const realizedPnL = coreReceived - costBasis;

 portfolio.realizedPnL = (parseFloat(portfolio.realizedPnL) + realizedPnL).toString();
 }

 // Update current value and last trade time
 portfolio.currentValue = (parseFloat(portfolio.balance) * tradeData.price).toString();
 portfolio.lastTradeAt = new Date();

 await portfolio.save();

 } catch (error) {
 console.error(' Error updating portfolio:', error);
 throw error;
 }
 }

 // Update agent metrics
 async updateAgentMetrics(agentAddress) {
 try {
 // This would trigger the real-time data processor
 // to recalculate agent metrics
 console.log(` Updating metrics for agent: ${agentAddress}`);

 // Clear agent cache
 if (this.databaseService) {
 await this.databaseService.clearCachePattern(`agent:${agentAddress}:*`);
 }

 } catch (error) {
 console.error(' Error updating agent metrics:', error);
 }
 }

 // Broadcast trade update
 broadcastTradeUpdate(tradeData) {
 if (this.websocketService) {
 this.websocketService.broadcast({
 type: 'realTradeExecuted',
 agentAddress: tradeData.agentAddress,
 trade: {
 type: tradeData.type,
 amount: tradeData.tokenAmount,
 price: tradeData.price,
 timestamp: new Date(),
 trader: tradeData.userAddress,
 transactionHash: tradeData.transactionHash
 },
 timestamp: Date.now()
 });
 }
 }

 // Clear trading-related caches
 async clearTradingCaches(agentAddress) {
 if (this.databaseService) {
 await this.databaseService.clearCachePattern(`agent:${agentAddress}:*`);
 await this.databaseService.clearCachePattern(`chart:${agentAddress}:*`);
 await this.databaseService.clearCachePattern(`price:${agentAddress}:*`);
 }
 }

 // Log failed trade attempt
 async logFailedTrade(failureData) {
 try {
 console.error(' Logging failed trade:', failureData);

 // In a production system, you might want to store failed trades
 // for analysis and debugging purposes

 } catch (error) {
 console.error(' Error logging failed trade:', error);
 }
 }

 // Get trading statistics
 async getTradingStats(userAddress) {
 try {
 const trades = await Trade.find({
 trader: userAddress.toLowerCase()
 }).sort({ timestamp: -1 });

 const portfolios = await Portfolio.find({
 userAddress: userAddress.toLowerCase(),
 isActive: true
 }).populate('agent');

 // Calculate statistics
 const totalTrades = trades.length;
 const totalVolume = trades.reduce((sum, trade) => sum + parseFloat(trade.coreAmount), 0);
 const totalFees = trades.reduce((sum, trade) => sum + (trade.fee || 0), 0);

 const buyTrades = trades.filter(t => t.type === 'buy');
 const sellTrades = trades.filter(t => t.type === 'sell');

 const totalInvested = portfolios.reduce((sum, p) => sum + parseFloat(p.totalInvested), 0);
 const currentValue = portfolios.reduce((sum, p) => sum + parseFloat(p.currentValue), 0);
 const realizedPnL = portfolios.reduce((sum, p) => sum + parseFloat(p.realizedPnL), 0);
 const unrealizedPnL = currentValue - totalInvested;

 return {
 totalTrades,
 buyTrades: buyTrades.length,
 sellTrades: sellTrades.length,
 totalVolume,
 totalFees,
 totalInvested,
 currentValue,
 realizedPnL,
 unrealizedPnL,
 totalPnL: realizedPnL + unrealizedPnL,
 portfolios: portfolios.length,
 avgTradeSize: totalTrades > 0? totalVolume / totalTrades: 0
 };

 } catch (error) {
 console.error(' Error getting trading stats:', error);
 throw error;
 }
 }

 // Get current price for an agent
 async getCurrentPrice(agentAddress) {
 try {
 const agent = await Agent.findOne({
 contractAddress: agentAddress.toLowerCase()
 });

 if (!agent) {
 return null;
 }

 // Try to get from blockchain first
 try {
 const quote = await this.blockchainService.getBuyQuote(agentAddress, 0.001);
 if (quote.success && quote.currentPrice) {
 return quote.currentPrice;
 }
 } catch (error) {
 console.log('Failed to get price from blockchain, using cached price');
 }

 // Fallback to cached price
 return agent.currentPrice || '0';
 } catch (error) {
 console.error('Error getting current price:', error);
 return null;
 }
 }
 // Ingest a confirmed Solana transaction and create a Trade record
 // TODO: Implement full Solana transaction parsing using connection.getParsedTransaction()
 // to extract SPL token transfers, SOL amounts, and determine trade direction.
 async ingestOnchainTransaction(txHash, agentAddress) {
 try {
 // 1) Check for existing record (idempotent)
 const exist = await Trade.findOne({ transactionHash: txHash }).lean();
 if (exist) {
 return { alreadyRecorded: true, transactionHash: txHash };
 }

 // 2) Fetch and parse the Solana transaction
 const parsedTx = await this.connection.getParsedTransaction(txHash, {
 maxSupportedTransactionVersion: 0
 });

 if (!parsedTx) {
 throw new Error('Transaction not found or not confirmed yet');
 }

 if (parsedTx.meta && parsedTx.meta.err) {
 throw new Error('Transaction failed on-chain');
 }

 // 3) Extract timestamp
 const ts = parsedTx.blockTime
? new Date(parsedTx.blockTime * 1000)
: new Date();

 // 4) Parse token transfers from transaction
 // TODO: Parse parsedTx.meta.preTokenBalances and postTokenBalances
 // to determine exact token and SOL amounts transferred.
 const tokenAmountStr = '0';
 const solAmountStr = '0';
 const type = 'buy'; // TODO: Determine from parsed instructions
 const trader = parsedTx.transaction?.message?.accountKeys?.[0]?.pubkey?.toString() || '';

 const tokenAmountNum = parseFloat(tokenAmountStr);
 const solAmountNum = parseFloat(solAmountStr);
 const price = tokenAmountNum > 0? solAmountNum / tokenAmountNum: 0;

 // 5) Record the trade
 await this.processSuccessfulTrade({
 type,
 userAddress: trader,
 agentAddress,
 coreAmount: solAmountStr,
 tokenAmount: tokenAmountStr,
 price,
 transactionHash: txHash,
 gasUsed: 0,
 gasPrice: '0',
 slippage: 0,
 fee: 0,
 blockNumber: parsedTx.slot || 0,
 timestamp: ts
 });

 return {
 recorded: true,
 type,
 agentAddress,
 trader,
 tokenAmount: tokenAmountStr,
 coreAmount: solAmountStr,
 price,
 blockNumber: parsedTx.slot || 0,
 timestamp: ts.toISOString(),
 txHash
 };
 } catch (err) {
 console.error('ingestOnchainTransaction error:', err);
 throw err;
 }
 }

}

module.exports = RealTradingEngine;
