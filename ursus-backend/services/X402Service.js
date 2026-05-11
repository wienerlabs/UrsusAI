const aiService = require('./AIService');

/**
 * X402 Service - Handles paid agent services
 * Uses the shared AIService (HuggingFace provider) for real AI responses.
 */
class X402Service {
  constructor() {
    this.aiService = aiService;
  }

  /**
   * Generate AI response via the shared AIService
   */
  async callAI(userPrompt, systemInstructions = 'You are a helpful AI assistant.', model = 'llama-3.1-8b') {
    return await this.aiService.generateResponse(model, systemInstructions, userPrompt);
  }

 /**
 * Execute a paid service based on service ID
 */
 async executeService(serviceId, agentData, paymentInfo) {
 console.log(`Executing X402 service: ${serviceId} for agent: ${agentData.name}`);

 switch (serviceId) {
 case 'market_analysis':
 return await this.getMarketAnalysis(agentData);

 case 'trading_signal':
 return await this.getTradingSignal(agentData);

 case 'portfolio_advice':
 return await this.getPortfolioAdvice(agentData);

 case 'price_prediction':
 return await this.getPricePrediction(agentData);

 default:
 return await this.getDefaultService(agentData, serviceId);
 }
 }

 /**
 * Market Analysis Service
 */
 async getMarketAnalysis(agentData) {
 const prompt = `You are ${agentData.name}, a professional crypto market analyst.

Provide a detailed market analysis for the top 3 cryptocurrencies (BTC, ETH, SOL).

For each coin, include:
- Current trend (Bullish/Bearish/Neutral)
- Key support and resistance levels
- Short-term outlook (24-48 hours)
- Trading recommendation

Keep it professional and concise.`;

 try {
 const response = await this.callAI(
 prompt,
 agentData.instructions || 'You are a professional crypto analyst.'
 );

 return {
 service_id: 'market_analysis',
 agent_name: agentData.name,
 result: response,
 timestamp: new Date().toISOString(),
 paid: true
 };
 } catch (error) {
 console.error('Error in market analysis:', error);
 return this.getErrorResponse('market_analysis', error);
 }
 }

 /**
 * Trading Signal Service
 */
 async getTradingSignal(agentData) {
 const prompt = `You are ${agentData.name}, a professional crypto trader.

Generate a specific trading signal for RIGHT NOW.

Include:
- Coin to trade (BTC, ETH, or SOL)
- Action (BUY/SELL/HOLD)
- Entry price (current market price)
- Take profit target
- Stop loss level
- Timeframe (short/medium/long term)
- Confidence level (1-10)
- Brief reasoning`;

 try {
 const response = await this.callAI(
 prompt,
 agentData.instructions || 'You are a professional crypto trader.'
 );

 return {
 service_id: 'trading_signal',
 agent_name: agentData.name,
 result: response,
 timestamp: new Date().toISOString(),
 paid: true
 };
 } catch (error) {
 console.error('Error in trading signal:', error);
 return this.getErrorResponse('trading_signal', error);
 }
 }

 /**
 * Portfolio Advice Service
 */
 async getPortfolioAdvice(agentData) {
 const prompt = `You are ${agentData.name}, a professional crypto portfolio manager.

Provide portfolio allocation advice for a $10,000 crypto portfolio.

Include:
- Recommended allocation percentages for BTC, ETH, SOL, and stablecoins
- Risk level (Conservative/Moderate/Aggressive)
- Rebalancing strategy
- Expected returns (realistic estimate)
- Risk management tips`;

 try {
 const response = await this.callAI(
 prompt,
 agentData.instructions || 'You are a professional portfolio advisor.'
 );

 return {
 service_id: 'portfolio_advice',
 agent_name: agentData.name,
 result: response,
 timestamp: new Date().toISOString(),
 paid: true
 };
 } catch (error) {
 console.error('Error in portfolio advice:', error);
 return this.getErrorResponse('portfolio_advice', error);
 }
 }

 /**
 * Price Prediction Service
 */
 async getPricePrediction(agentData) {
 const prompt = `You are ${agentData.name}, a crypto price prediction expert.

Provide price predictions for BTC, ETH, and SOL for the next 24 hours.

For each coin include:
- Current price estimate
- Predicted price in 24 hours
- Percentage change
- Confidence level (1-10)
- Key factors influencing the prediction`;

 try {
 const response = await this.callAI(
 prompt,
 agentData.instructions || 'You are a professional price analyst.'
 );

 return {
 service_id: 'price_prediction',
 agent_name: agentData.name,
 result: response,
 timestamp: new Date().toISOString(),
 paid: true
 };
 } catch (error) {
 console.error('Error in price prediction:', error);
 return this.getErrorResponse('price_prediction', error);
 }
 }

 /**
 * Default service for unknown service IDs
 */
 async getDefaultService(agentData, serviceId) {
 const prompt = `You are ${agentData.name}. A user has paid for the service: "${serviceId}".

Provide a helpful and professional response related to crypto trading, market analysis, or investment advice.

Keep it valuable and actionable.`;

 try {
 const response = await this.callAI(
 prompt,
 agentData.instructions || 'You are a helpful AI assistant.'
 );

 return {
 service_id: serviceId,
 agent_name: agentData.name,
 result: response,
 timestamp: new Date().toISOString(),
 paid: true
 };
 } catch (error) {
 console.error('Error in default service:', error);
 return this.getErrorResponse(serviceId, error);
 }
 }

 /**
 * Error response
 */
 getErrorResponse(serviceId, error) {
 return {
 service_id: serviceId,
 error: true,
 message: 'Service temporarily unavailable. Please try again.',
 details: error.message,
 timestamp: new Date().toISOString()
 };
 }
}

module.exports = X402Service;

