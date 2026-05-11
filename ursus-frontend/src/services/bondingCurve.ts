/**
 * URSUS Bonding Curve Service
 * Solana-native implementation for URSUS platform bonding curve trading
 * All blockchain interactions go through the backend API
 * Direct Solana program interaction is handled by useBondingCurveTrading hook
 */

import { apiService } from './api';

// Trading Response Interfaces
export interface BondingCurveQuote {
  tokenAmount: string;
  coreAmount: string;
  currentPrice: string;
  newPrice: string;
  priceImpact: number;
  platformFee: string;
  slippage: number;
  minimumReceived: string;
  gasEstimate: string;
  riskLevel: 'low' | 'medium' | 'high';
  warning?: string;
}

export interface BondingCurveTrade {
  success: boolean;
  transactionHash?: string;
  tokenAmount?: string;
  coreAmount?: string;
  gasUsed?: string;
  effectivePrice?: string;
  error?: string;
}

export interface AgentTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  instructions: string;
  model: string;
  creator: string;
  createdAt: number;
  currentSupply: string;
  totalSupply: string;
  reserveBalance: string;
  currentPrice: string;
  marketCap: string;
  isGraduated: boolean;
}

export class BondingCurveError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'BondingCurveError';
    this.code = code;
    this.details = details;
  }
}

class BondingCurveService {
  /**
   * Get comprehensive token information from backend API
   */
  async getTokenInfo(tokenAddress: string): Promise<AgentTokenInfo> {
    try {
      const response = await apiService.get(`/agents/${tokenAddress}`) as any;
      const backendResponse = response.data;

      if (!backendResponse || !backendResponse.success || !backendResponse.data) {
        throw new BondingCurveError(
          'TOKEN_INFO_ERROR',
          backendResponse?.error || 'Failed to get token information'
        );
      }

      const agent = backendResponse.data;

      return {
        address: tokenAddress,
        name: agent.name || agent.tokenName || 'Unknown',
        symbol: agent.symbol || agent.tokenSymbol || 'UNKNOWN',
        decimals: 9,
        description: agent.description || agent.agentInfo?.description || '',
        instructions: agent.instructions || agent.agentInfo?.instructions || '',
        model: agent.model || agent.agentInfo?.model || 'llama3-8b-8192',
        creator: agent.creator || agent.metadata?.creator || agent.creatorAddress || '',
        createdAt: agent.createdAt ? new Date(agent.createdAt).getTime() : Date.now(),
        currentSupply: agent.tokenomics?.currentSupply || '0',
        totalSupply: agent.tokenomics?.totalSupply || agent.totalSupply || '1073000000000000',
        reserveBalance: agent.tokenomics?.reserve || '0',
        currentPrice: agent.tokenomics?.currentPrice || agent.currentPrice || '0',
        marketCap: agent.tokenomics?.marketCap || agent.marketCap || '0',
        isGraduated: agent.isGraduated || agent.metadata?.isGraduated || false
      };
    } catch (error: unknown) {
      if (error instanceof BondingCurveError) throw error;
      const message = error instanceof Error ? error.message : 'Failed to get token information';
      throw new BondingCurveError('TOKEN_INFO_ERROR', message, error);
    }
  }

  /**
   * Get buy quote from backend API
   */
  async getBuyQuote(tokenAddress: string, solAmount: string): Promise<BondingCurveQuote> {
    try {
      const response = await apiService.get(`/trading/quote/buy/${tokenAddress}?amount=${solAmount}`) as any;

      if (!response.success || !response.data) {
        throw new BondingCurveError(
          'QUOTE_ERROR',
          response.error || 'Failed to get buy quote'
        );
      }

      const quote = response.data as any;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let warning: string | undefined;

      if (quote.priceImpact > 10) {
        riskLevel = 'high';
        warning = 'Very high price impact detected. Consider reducing trade size.';
      } else if (quote.priceImpact > 5) {
        riskLevel = 'medium';
        warning = 'High price impact detected.';
      }

      return {
        tokenAmount: quote.tokensOut.toString(),
        coreAmount: solAmount,
        currentPrice: quote.currentPrice.toString(),
        newPrice: quote.newPrice.toString(),
        priceImpact: quote.priceImpact,
        platformFee: quote.platformFee.toString(),
        slippage: 0.5,
        minimumReceived: (parseFloat(quote.tokensOut) * 0.995).toString(),
        gasEstimate: '0.00001',
        riskLevel,
        warning
      };
    } catch (error: unknown) {
      if (error instanceof BondingCurveError) throw error;
      const message = error instanceof Error ? error.message : 'Failed to get buy quote';
      throw new BondingCurveError('QUOTE_ERROR', message, error);
    }
  }

  /**
   * Get sell quote from backend API
   */
  async getSellQuote(tokenAddress: string, tokenAmount: string): Promise<BondingCurveQuote> {
    try {
      const response = await apiService.get(`/trading/quote/sell/${tokenAddress}?amount=${tokenAmount}`) as any;

      if (!response.success || !response.data) {
        throw new BondingCurveError(
          'QUOTE_ERROR',
          response.error || 'Failed to get sell quote'
        );
      }

      const quote = response.data as any;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let warning: string | undefined;

      if (quote.priceImpact > 10) {
        riskLevel = 'high';
        warning = 'Very high price impact detected. Consider reducing trade size.';
      } else if (quote.priceImpact > 5) {
        riskLevel = 'medium';
        warning = 'High price impact detected.';
      }

      return {
        tokenAmount: tokenAmount,
        coreAmount: quote.solOut.toString(),
        currentPrice: quote.currentPrice.toString(),
        newPrice: quote.newPrice.toString(),
        priceImpact: quote.priceImpact,
        platformFee: quote.platformFee.toString(),
        slippage: 0.5,
        minimumReceived: (parseFloat(quote.solOut) * 0.995).toString(),
        gasEstimate: '0.00001',
        riskLevel,
        warning
      };
    } catch (error: unknown) {
      if (error instanceof BondingCurveError) throw error;
      const message = error instanceof Error ? error.message : 'Failed to get sell quote';
      throw new BondingCurveError('QUOTE_ERROR', message, error);
    }
  }

  /**
   * Execute buy — trade execution is handled by useBondingCurveTrading hook
   * This method records the completed trade via backend API
   */
  async recordBuy(tokenAddress: string, txHash: string, solAmount: string, userAddress: string): Promise<BondingCurveTrade> {
    try {
      const response = await apiService.post('/trading/buy', {
        agentAddress: tokenAddress,
        userAddress,
        coreAmount: parseFloat(solAmount),
        txHash
      }) as any;

      return {
        success: true,
        transactionHash: txHash,
        tokenAmount: response.data?.tokenAmount?.toString(),
        coreAmount: solAmount
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to record buy';
      return { success: false, error: message };
    }
  }

  /**
   * Execute sell — trade execution is handled by useBondingCurveTrading hook
   * This method records the completed trade via backend API
   */
  async recordSell(tokenAddress: string, txHash: string, tokenAmount: string, userAddress: string): Promise<BondingCurveTrade> {
    try {
      const response = await apiService.post('/trading/sell', {
        agentAddress: tokenAddress,
        userAddress,
        tokenAmount: parseFloat(tokenAmount),
        txHash
      }) as any;

      return {
        success: true,
        transactionHash: txHash,
        tokenAmount: tokenAmount,
        coreAmount: response.data?.solAmount?.toString()
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to record sell';
      return { success: false, error: message };
    }
  }

  /**
   * Get trading history from backend
   */
  async getTradingHistory(tokenAddress: string, limit = 50): Promise<any[]> {
    try {
      const response = await apiService.get<any>(`/agents/${tokenAddress}/trades?limit=${limit}`);
      const rawData = response.data;
      return rawData?.data || rawData?.trades || (Array.isArray(rawData) ? rawData : []);
    } catch (error) {
      console.error('Error getting trading history:', error);
      return [];
    }
  }

  /**
   * Get price history from backend
   */
  async getPriceHistory(tokenAddress: string, interval = '1h', limit = 100): Promise<any[]> {
    try {
      const response = await apiService.get<{ priceHistory: any[] }>(`/agents/${tokenAddress}/price-history?interval=${interval}&limit=${limit}`);
      return response.data.priceHistory || [];
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }
}

// Create singleton instance
export const bondingCurveService = new BondingCurveService();
export default bondingCurveService;
