const { Connection } = require('@solana/web3.js');
const { formatLamports } = require('../utils/solana');
const EventEmitter = require('events');

class EventListenerService extends EventEmitter {
  constructor() {
    super();
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || process.env.CORE_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    this.PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || process.env.AGENT_FACTORY_ADDRESS || '';

    // Trading service reference (will be set later to avoid circular dependency)
    this.tradingService = null;

    // Event storage (in production, use database)
    this.events = [];
    this.agentEvents = new Map(); // agentAddress -> events[]
    this.priceHistory = new Map(); // agentAddress -> price history
    this.volumeData = new Map(); // agentAddress -> volume data

    // Start listening
    this.startListening();
  }

  async startListening() {
    console.log('Starting Solana event listener...');

    try {
      // TODO: Implement Solana program log subscription using connection.onLogs()
      // to parse program events (AgentCreated, TokensPurchased, TokensSold, etc.)
      // from the Solana program at this.PROGRAM_ID.
      //
      // Example:
      // if (this.PROGRAM_ID) {
      //   const programPubkey = new (require('@solana/web3.js').PublicKey)(this.PROGRAM_ID);
      //   this.connection.onLogs(programPubkey, (logs) => {
      //     // Parse logs for AgentCreated, TokensPurchased, TokensSold events
      //     // and emit corresponding events
      //   }, 'confirmed');
      // }

      console.log('Event listener initialized (Solana log subscription pending implementation)');
    } catch (error) {
      console.error('Error starting event listener:', error);
    }
  }

  // TODO: Implement Solana account change listener using connection.onAccountChange()
  // to watch for token account updates and parse program logs for trade events.
  async listenToAgentToken(tokenAddress) {
    try {
      // Placeholder: On Solana, subscribe to account changes for the token mint
      // and parse program logs to detect TokensPurchased / TokensSold events.
      //
      // Example:
      // const mintPubkey = new (require('@solana/web3.js').PublicKey)(tokenAddress);
      // this.connection.onAccountChange(mintPubkey, (accountInfo) => {
      //   // Parse account data for state changes
      // }, 'confirmed');

      console.log(`Registered agent for monitoring: ${tokenAddress} (Solana log parsing pending)`);
    } catch (error) {
      console.error(`Error registering agent token listener ${tokenAddress}:`, error);
    }
  }

  // TODO: Implement Solana historical event fetching using connection.getSignaturesForAddress()
  // and connection.getParsedTransaction() to replay past program logs.
  async getHistoricalAgentEvents() {
    try {
      console.log('Historical event fetching (Solana implementation pending)');
      // On Solana, fetch recent transaction signatures for the program and parse logs.
    } catch (error) {
      console.error('Error fetching historical events:', error);
    }
  }

  // TODO: Implement Solana historical token event fetching using
  // connection.getSignaturesForAddress() and parsing transaction logs.
  async getHistoricalAgentTokenEvents(tokenAddress, fromSlot) {
    try {
      console.log(`Historical token event fetching for ${tokenAddress} (Solana implementation pending)`);
      // Initialize price history from DB
      await this.initializePriceHistory(tokenAddress);
    } catch (error) {
      console.error(`Error fetching historical events for ${tokenAddress}:`, error);
    }
  }

  addAgentEvent(agentAddress, event) {
    if (!this.agentEvents.has(agentAddress)) {
      this.agentEvents.set(agentAddress, []);
    }
    this.agentEvents.get(agentAddress).push(event);
  }

  // TODO: Fetch live price from Solana on-chain account data or Jupiter API
  async updatePriceHistory(agentAddress, price) {
    try {
      // Use price passed from trade event or fetch from DB
      const priceValue = price || '0';

      if (!this.priceHistory.has(agentAddress)) {
        this.priceHistory.set(agentAddress, []);
      }

      const history = this.priceHistory.get(agentAddress);
      history.push({
        price: priceValue,
        timestamp: Date.now()
      });

      // Keep only last 1000 price points
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }
    } catch (error) {
      console.error(`Error updating price history for ${agentAddress}:`, error);
    }
  }

  // TODO: Initialize from Solana on-chain data or database
  async initializePriceHistory(agentAddress) {
    try {
      if (!this.priceHistory.has(agentAddress)) {
        this.priceHistory.set(agentAddress, []);
      }

      // Add initial price point from DB if available
      const Agent = require('../models/Agent');
      const agent = await Agent.findOne({
        $or: [
          { contractAddress: new RegExp(`^${agentAddress}$`, 'i') },
          { mintAddress: new RegExp(`^${agentAddress}$`, 'i') }
        ]
      });

      const initialPrice = agent?.tokenomics?.currentPrice || '0';
      this.priceHistory.get(agentAddress).push({
        price: initialPrice,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error initializing price history for ${agentAddress}:`, error);
    }
  }

  updateVolumeData(agentAddress, amount) {
    if (!this.volumeData.has(agentAddress)) {
      this.volumeData.set(agentAddress, {
        volume24h: 0,
        volumeHistory: []
      });
    }
    
    const data = this.volumeData.get(agentAddress);
    const now = Date.now();
    
    // Add to volume history
    data.volumeHistory.push({
      amount: parseFloat(amount),
      timestamp: now
    });
    
    // Calculate 24h volume
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    data.volume24h = data.volumeHistory
      .filter(v => v.timestamp > oneDayAgo)
      .reduce((sum, v) => sum + v.amount, 0);
    
    // Clean old data (keep only last 7 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    data.volumeHistory = data.volumeHistory.filter(v => v.timestamp > sevenDaysAgo);
  }

  // Getter methods for analytics
  getAgentEvents(agentAddress, limit = 100) {
    const events = this.agentEvents.get(agentAddress) || [];
    return events.slice(-limit).reverse(); // Most recent first
  }

  getPriceHistory(agentAddress, timeframe = '24h') {
    const history = this.priceHistory.get(agentAddress) || [];
    const now = Date.now();
    
    let cutoff;
    switch (timeframe) {
      case '1h':
        cutoff = now - 60 * 60 * 1000;
        break;
      case '24h':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoff = now - 24 * 60 * 60 * 1000;
    }
    
    return history.filter(p => p.timestamp > cutoff);
  }

  getVolumeData(agentAddress) {
    return this.volumeData.get(agentAddress) || { volume24h: 0, volumeHistory: [] };
  }

  getAllEvents(limit = 100) {
    return this.events.slice(-limit).reverse();
  }

  // Set trading service reference
  setTradingService(tradingService) {
    this.tradingService = tradingService;
  }

  // Process trade through trading service
  async processTrade(tradeData) {
    if (this.tradingService) {
      try {
        await this.tradingService.processTrade(tradeData);
      } catch (error) {
        console.error('Error processing trade:', error);
      }
    }
  }

  getAgentStats(agentAddress) {
    const events = this.agentEvents.get(agentAddress) || [];
    const volumeData = this.getVolumeData(agentAddress);
    const priceHistory = this.getPriceHistory(agentAddress, '24h');

    // Calculate stats
    const purchases = events.filter(e => e.type === 'TokensPurchased');
    const sales = events.filter(e => e.type === 'TokensSold');
    const interactions = events.filter(e => e.type === 'AgentInteraction');

    const uniqueHolders = new Set([
      ...purchases.map(p => p.buyer),
      ...sales.map(s => s.seller)
    ]).size;

    const transactions24h = events.filter(e =>
      e.timestamp > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    const priceChange24h = priceHistory.length >= 2
      ? ((parseFloat(priceHistory[priceHistory.length - 1].price) - parseFloat(priceHistory[0].price)) / parseFloat(priceHistory[0].price)) * 100
      : 0;

    return {
      holders: uniqueHolders,
      transactions24h,
      volume24h: volumeData.volume24h,
      priceChange24h,
      totalPurchases: purchases.length,
      totalSales: sales.length,
      totalInteractions: interactions.length
    };
  }
}

module.exports = new EventListenerService();
