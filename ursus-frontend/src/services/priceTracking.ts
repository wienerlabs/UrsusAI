/**
 * URSUS Real-Time Price Tracking Service
 * Tracks agent token prices using WebSocket and backend API
 * Solana-native — no EVM dependencies
 */

import { apiService } from './api';
import bondingCurveService from './bondingCurve';

export interface PriceUpdate {
  tokenAddress: string;
  price: string;
  marketCap: string;
  volume24h: string;
  priceChange24h: number;
  timestamp: number;
  source: 'api' | 'websocket';
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: string;
  volume: string;
  marketCap: string;
}

export interface TradingEvent {
  id: string;
  tokenAddress: string;
  type: 'buy' | 'sell';
  user: string;
  coreAmount: string;
  tokenAmount: string;
  price: string;
  timestamp: number;
  transactionHash: string;
}

class PriceTrackingService {
  private priceSubscriptions: Map<string, Set<(update: PriceUpdate) => void>> = new Map();
  private tradingSubscriptions: Map<string, Set<(event: TradingEvent) => void>> = new Map();
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        this.reconnectAttempts = 0;
        this.websocket?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'price-updates'
        }));
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        this.handleWebSocketReconnect();
      };

      this.websocket.onerror = () => {
        // onclose will fire after onerror, reconnect handled there
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private handleWebSocketReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.initializeWebSocket(), delay);
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'price-update':
        this.handlePriceUpdate(data.payload);
        break;
      case 'trading-event':
        this.handleTradingEvent(data.payload);
        break;
    }
  }

  private handlePriceUpdate(update: PriceUpdate) {
    const subscribers = this.priceSubscriptions.get(update.tokenAddress);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }
    const globalSubscribers = this.priceSubscriptions.get('*');
    if (globalSubscribers) {
      globalSubscribers.forEach(callback => callback(update));
    }
  }

  private handleTradingEvent(event: TradingEvent) {
    const subscribers = this.tradingSubscriptions.get(event.tokenAddress);
    if (subscribers) {
      subscribers.forEach(callback => callback(event));
    }
    const globalSubscribers = this.tradingSubscriptions.get('*');
    if (globalSubscribers) {
      globalSubscribers.forEach(callback => callback(event));
    }
  }

  /**
   * Subscribe to price updates for a specific token
   */
  subscribeToPriceUpdates(
    tokenAddress: string,
    callback: (update: PriceUpdate) => void
  ): () => void {
    if (!this.priceSubscriptions.has(tokenAddress)) {
      this.priceSubscriptions.set(tokenAddress, new Set());
    }
    this.priceSubscriptions.get(tokenAddress)!.add(callback);

    // Tell WebSocket server to track this token
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: `agent:${tokenAddress}`
      }));
    }

    return () => {
      const subscribers = this.priceSubscriptions.get(tokenAddress);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.priceSubscriptions.delete(tokenAddress);
          if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
              type: 'unsubscribe',
              channel: `agent:${tokenAddress}`
            }));
          }
        }
      }
    };
  }

  /**
   * Subscribe to trading events for a specific token
   */
  subscribeToTradingEvents(
    tokenAddress: string,
    callback: (event: TradingEvent) => void
  ): () => void {
    if (!this.tradingSubscriptions.has(tokenAddress)) {
      this.tradingSubscriptions.set(tokenAddress, new Set());
    }
    this.tradingSubscriptions.get(tokenAddress)!.add(callback);

    return () => {
      const subscribers = this.tradingSubscriptions.get(tokenAddress);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.tradingSubscriptions.delete(tokenAddress);
        }
      }
    };
  }

  /**
   * Get current price from backend API
   */
  async getCurrentPrice(tokenAddress: string): Promise<PriceUpdate | null> {
    try {
      const tokenInfo = await bondingCurveService.getTokenInfo(tokenAddress);
      return {
        tokenAddress,
        price: tokenInfo.currentPrice,
        marketCap: tokenInfo.marketCap,
        volume24h: '0',
        priceChange24h: 0,
        timestamp: Date.now(),
        source: 'api'
      };
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(
    tokenAddress: string,
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
    limit = 100
  ): Promise<PriceHistoryPoint[]> {
    try {
      const response = await apiService.get<{ priceHistory: PriceHistoryPoint[] }>(
        `/agents/${tokenAddress}/price-history?interval=${interval}&limit=${limit}`
      );
      return response.data.priceHistory || [];
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Get trading history for a token
   */
  async getTradingHistory(tokenAddress: string, limit = 50): Promise<TradingEvent[]> {
    try {
      const response = await apiService.get<{ trades: TradingEvent[] }>(`/agents/${tokenAddress}/trades?limit=${limit}`);
      return response.data.trades || [];
    } catch (error) {
      console.error('Error getting trading history:', error);
      return [];
    }
  }

  /**
   * Cleanup all subscriptions and connections
   */
  cleanup() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.priceSubscriptions.clear();
    this.tradingSubscriptions.clear();
  }
}

export const priceTrackingService = new PriceTrackingService();
export default priceTrackingService;
