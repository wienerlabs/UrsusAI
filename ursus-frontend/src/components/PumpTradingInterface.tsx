import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Clock, Users, XCircle, ExternalLink, Inbox } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { usePriceUpdates } from '../hooks/useWebSocket';
import { useBondingCurveTrading } from '../hooks/useBondingCurveTrading';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { EmptyState } from './ui';

interface Agent {
  address: string;
  tokenName: string;
  tokenSymbol: string;
  symbol?: string; // For backward compatibility
  currentPrice: string;
  marketCap: string;
  priceChange24h?: string;
  volume24h?: string;
  holders?: number;
  isGraduated?: boolean;
  bondingCurveInfo?: {
    reserve: string;
    supply: string;
    progress: number;
  };
}

interface Quote {
  inputAmount: string;
  outputAmount: string;
  tokensReceived?: string;
  solReceived?: string;
  priceImpact: number;
  fee?: string;
  fees?: {
    totalFees: string;
    platformFee?: string;
    creatorFee?: string;
  };
  slippage: number;
  minimumReceived?: string;
  gasEstimate?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  warning?: string;
}

interface Trade {
  id: string;
  type: 'buy' | 'sell' | 'tokensPurchased' | 'tokensSold';
  amount: string;
  price: string;
  timestamp: string | number;
  user: string;
  tokensReceived?: string;
  tokensAmount?: string;
  solAmount?: string;
  solReceived?: string;
  txHash?: string;
  transactionHash?: string;
}

interface PumpTradingInterfaceProps {
  agentAddress: string;
  agentData: Agent;
}

const PumpTradingInterface: React.FC<PumpTradingInterfaceProps> = ({
  agentAddress,
  agentData
}) => {
  const { isConnected, address } = useWallet();
  const { priceData } = usePriceUpdates(agentAddress);

  // Agent stats from real-time data
  const agentStats = {
    currentPrice: priceData?.price || parseFloat(agentData?.currentPrice || '0'),
    marketCap: parseFloat(agentData?.marketCap || '0'),
    volume24h: parseFloat(agentData?.volume24h || '0'),
    holders: agentData?.holders || 0,
    priceChange24h: parseFloat(agentData?.priceChange24h || '0')
  };
  const recentEvents = useMemo(() => {
    return [] as Array<{id: string; type: string; data: Record<string, unknown>; timestamp: number}>;
  }, []);

  // URSUS Bonding Curve Trading Integration
  const {
    isTrading,
    quoteLoading,
    getQuote: getBondingCurveQuote,
    executeTrade: executeBondingCurveTrade,
    error: tradingError,
    tokenInfo: bondingTokenInfo,
    tradingHistory,
    isGraduated,
    currentPrice: bondingCurvePrice,
    marketCap: bondingCurveMarketCap
  } = useBondingCurveTrading(agentAddress);

  // Trading state
  const needsApproval = false; // URSUS bonding curve doesn't need approval for SOL
  const approving = false;
  const virtualsTrades = useMemo(() => tradingHistory || [], [tradingHistory]);

  // Trading functions
  const executeTrade = useCallback(async (type: 'buy' | 'sell', amount: string) => {
    return await executeBondingCurveTrade(type, amount);
  }, [executeBondingCurveTrade]);

  const approveAllowance = useCallback(async () => true, []); // No approval needed for SOL

  // Get real token balance from Solana
  const mintAddress = agentData?.mintAddress || agentData?.bondingCurveInfo?.mintAddress;
  const { balance: realTokenBalance, refetch: refetchBalance } = useTokenBalance(mintAddress);

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'sentient' | 'prototype'>('sentient');
  const userBalance = realTokenBalance;
  const [showApproval, setShowApproval] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  // Quick buy amounts (in SOL)
  const quickAmounts = ['0.1', '0.5', '1', '5', '10'];

  const getQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      // Use URSUS bonding curve for real quotes
      const bondingQuote = await getBondingCurveQuote(activeTab, amount);

      if (bondingQuote) {
        // Convert bonding curve quote to our Quote interface
        const convertedQuote: Quote = {
          inputAmount: bondingQuote.inputAmount,
          outputAmount: bondingQuote.outputAmount,
          tokensReceived: bondingQuote.tokensReceived,
          solReceived: bondingQuote.solReceived,
          priceImpact: bondingQuote.priceImpact,
          slippage: bondingQuote.slippage,
          fees: bondingQuote.fees,
          minimumReceived: bondingQuote.minimumReceived,
          gasEstimate: bondingQuote.gasEstimate,
          riskLevel: bondingQuote.riskLevel,
          warning: bondingQuote.warning
        };

        setQuote(convertedQuote);
      } else {
        setQuote(null);
      }
    } catch (error) {
      console.error('Quote error:', error);
      setQuote(null);
    }
  }, [amount, activeTab]); // Removed getBondingCurveQuote dependency to prevent re-renders

  // Get quote when amount changes - with debounce
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const timeoutId = setTimeout(() => {
        getQuote();
      }, 800); // Quick debounce - 0.8 seconds for responsive UX

      return () => clearTimeout(timeoutId);
    } else {
      setQuote(null);
    }
  }, [amount, activeTab, getQuote]);

  // Update recent trades from Virtuals Protocol and WebSocket
  useEffect(() => {
    // Combine backend trades with WebSocket events
    const combinedTrades: Trade[] = [];

    // Add trades from backend API
    if (virtualsTrades && virtualsTrades.length > 0) {
      const backendTrades = virtualsTrades.map((t: any) => ({
        id: t.txHash || t.transactionHash || `trade-${t.timestamp}`,
        type: (t.type || 'buy') as 'buy' | 'sell',
        amount: t.coreAmount || t.amount || '0',
        price: t.price || '0',
        timestamp: new Date(t.timestamp).getTime() || Date.now(),
        user: t.trader || t.userAddress || 'Unknown',
        txHash: t.txHash || t.transactionHash,
      }));
      combinedTrades.push(...backendTrades);
    }

    // Add WebSocket events
    if (recentEvents) {
      const tradeEvents = recentEvents.filter(event =>
        event.type === 'tokensPurchased' || event.type === 'tokensSold'
      ).map(event => {
        const eventData = event.data as { amount?: string; price?: string; user?: string; tokensReceived?: string; solReceived?: string };
        return {
          id: `ws-${event.timestamp}`,
          type: event.type === 'tokensPurchased' ? 'buy' : 'sell' as 'buy' | 'sell',
          amount: eventData?.amount || '0',
          price: eventData?.price || '0',
          timestamp: event.timestamp,
          user: eventData?.user || 'Unknown',
          tokensReceived: eventData?.tokensReceived,
          solReceived: eventData?.solReceived
        };
      });
      combinedTrades.push(...tradeEvents);
    }

    // Sort by timestamp and take latest 10
    const sortedTrades = combinedTrades
      .sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? parseInt(a.timestamp) : a.timestamp;
        const timeB = typeof b.timestamp === 'string' ? parseInt(b.timestamp) : b.timestamp;
        return timeB - timeA;
      })
      .slice(0, 10);

    setRecentTrades(sortedTrades);
  }, [recentEvents, virtualsTrades]);

  const handleTrade = async () => {
    if (!isConnected || !quote || !amount) return;

    try {
      // Check if approval is needed first
      if (needsApproval && activeTab === 'sell') {
        setShowApproval(true);
        return;
      }

      // Execute the trade using URSUS bonding curve
      const success = await executeTrade(activeTab, amount);

      if (success) {
        // Reset form
        setAmount('');
        setQuote(null);
        setShowApproval(false);

        // Show success message
        alert(`${activeTab === 'buy' ? 'Purchase' : 'Sale'} successful!`);

        // Refresh balance
        fetchUserBalance();
      } else {
        alert('Trade failed. Please try again.');
      }
    } catch (error) {
      console.error('Trade error:', error);
      alert('Trade failed. Please try again.');
    }
  };

  const handleApproval = async () => {
    if (!amount) return;

    const success = await approveAllowance();
    if (success) {
      setShowApproval(false);
      // Now execute the trade
      handleTrade();
    } else {
      alert('Approval failed. Please try again.');
    }
  };

  const fetchUserBalance = useCallback(async () => {
    if (!isConnected || !address) return;
    // Balance is now handled by useTokenBalance hook
    refetchBalance();

  }, [isConnected, address]);

  useEffect(() => {
    fetchUserBalance();
  }, [isConnected, address, agentAddress, fetchUserBalance]);

  const formatNumber = (num: number | string, decimals = 6) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n === 0) return '0';
    if (n < 0.000001) return '<0.000001';
    return n.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  // Use URSUS backend data (prefer bonding curve data if available)
  const currentPrice = bondingCurvePrice || agentStats?.currentPrice || agentData?.currentPrice || '0';
  const marketCap = bondingCurveMarketCap || agentStats?.marketCap || agentData?.marketCap || '0';
  const priceChange = parseFloat(String(agentStats?.priceChange24h || agentData?.priceChange24h || 0));
  const graduationStatus = isGraduated || agentData?.isGraduated || false;

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-6 space-y-6 shadow-card">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated border border-border-subtle rounded-lg p-3">
          <p className="text-caption text-content-muted">Price</p>
          <p className="text-body font-semibold text-content-primary">{formatNumber(currentPrice)} SOL</p>
        </div>
        <div className="bg-surface-elevated border border-border-subtle rounded-lg p-3">
          <p className="text-caption text-content-muted">Market Cap</p>
          <p className="text-body font-semibold text-content-primary">{formatNumber(marketCap)} SOL</p>
        </div>
        <div className="bg-surface-elevated border border-border-subtle rounded-lg p-3">
          <p className="text-caption text-content-muted">24h Change</p>
          <div className="flex items-center gap-1">
            {priceChange >= 0 ? (
              <TrendingUp className="w-3 h-3 text-success" />
            ) : (
              <TrendingDown className="w-3 h-3 text-danger" />
            )}
            <p className={`text-body font-semibold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{formatNumber(priceChange, 2)}%
            </p>
          </div>
        </div>
        <div className="bg-surface-elevated border border-border-subtle rounded-lg p-3">
          <p className="text-caption text-content-muted">Holders</p>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-content-muted" />
            <p className="text-body font-semibold text-content-primary">{agentStats?.holders || 0}</p>
          </div>
        </div>
      </div>

      {/* Graduation Status */}
      {graduationStatus && (
        <div className="bg-success-subtle border border-success-muted rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-success" />
            <p className="text-success text-body font-semibold">Graduated to DEX!</p>
          </div>
          <p className="text-content-secondary text-body-sm mt-1">
            This token has graduated and is now trading on the DEX.
          </p>
        </div>
      )}

      {/* Error Display */}
      {tradingError && (
        <div className="bg-danger-subtle border border-danger-muted rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-danger" />
            <p className="text-danger text-body font-semibold">Trading Error</p>
          </div>
          <p className="text-content-secondary text-body-sm mt-1">{tradingError.message}</p>
        </div>
      )}

      {/* Trading Interface */}
      {!graduationStatus && (
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex bg-surface-elevated border border-border-subtle rounded-lg p-1">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 px-4 rounded-md text-body-sm font-semibold border transition-colors duration-base ${
                activeTab === 'buy'
                  ? 'bg-success-subtle text-success border-success-muted'
                  : 'text-content-muted border-transparent hover:text-content-primary hover:bg-surface-hover'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`flex-1 py-2 px-4 rounded-md text-body-sm font-semibold border transition-colors duration-base ${
                activeTab === 'sell'
                  ? 'bg-danger-subtle text-danger border-danger-muted'
                  : 'text-content-muted border-transparent hover:text-content-primary hover:bg-surface-hover'
              }`}
            >
              Sell
            </button>
          </div>

          {/* User Balance */}
          {isConnected && (
            <div className="bg-surface-elevated border border-border-subtle rounded-lg p-3">
              <p className="text-caption text-content-muted">
                Your Balance: <span className="text-body-sm text-content-primary font-medium">{formatNumber(userBalance)} {agentData?.symbol}</span>
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-caption font-medium text-content-muted mb-2">
                {activeTab === 'buy' ? 'SOL Amount' : 'Token Amount'}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${activeTab === 'buy' ? 'SOL' : agentData?.symbol || 'tokens'} amount`}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-lg text-display-xs font-semibold text-content-primary placeholder:text-content-subtle placeholder:font-normal placeholder:text-body focus:outline-none focus:border-border-focus transition-colors duration-base"
                step="0.000001"
                min="0"
              />
            </div>

            {/* Quick Amount Buttons (Buy only) */}
            {activeTab === 'buy' && (
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount)}
                    className="px-3 py-2 bg-surface-elevated border border-border rounded-md text-caption font-medium text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors duration-base"
                  >
                    {quickAmount} SOL
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quote Loading */}
          {quoteLoading && (
            <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-body-sm text-content-muted">Getting quote...</span>
              </div>
            </div>
          )}

          {/* Quote Display */}
          {quote && !quoteLoading && (
            <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-caption text-content-muted">
                  {activeTab === 'buy' ? 'You will receive' : 'You will get'}
                </span>
                <span className="text-body font-medium text-content-primary">
                  {formatNumber(activeTab === 'buy' ? (quote.tokensReceived || '0') : (quote.solReceived || '0'))}{' '}
                  {activeTab === 'buy' ? agentData?.symbol : 'SOL'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-caption text-content-muted">Price Impact</span>
                <span className={`text-body-sm font-medium ${
                  quote.priceImpact > 5 ? 'text-danger' :
                  quote.priceImpact > 2 ? 'text-warning' : 'text-success'
                }`}>
                  {formatNumber(quote.priceImpact, 2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-caption text-content-muted">Slippage Tolerance</span>
                <span className="text-body-sm text-content-primary">{formatNumber(quote.slippage, 2)}%</span>
              </div>

              {quote.fees && (
                <div className="flex justify-between items-center">
                  <span className="text-caption text-content-muted">Platform Fee</span>
                  <span className="text-body-sm text-content-primary">{formatNumber(quote.fees.totalFees)} SOL</span>
                </div>
              )}

              {quote.riskLevel && quote.riskLevel !== 'low' && (
                <div className="flex items-start gap-2 mt-3 p-2 bg-warning-subtle border border-warning-muted rounded-md">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  <div>
                    <p className="text-warning text-body-sm font-semibold">
                      {quote.riskLevel === 'high' ? 'High Risk Trade' : 'Medium Risk Trade'}
                    </p>
                    <p className="text-content-secondary text-micro">
                      Large price impact detected. Consider splitting your trade.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approval Section */}
          {showApproval && needsApproval && (
            <div className="bg-warning-subtle border border-warning-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="text-warning text-body font-semibold">Approval Required</p>
              </div>
              <p className="text-content-secondary text-body-sm">
                You need to approve the contract to spend your {bondingTokenInfo?.symbol || agentData?.symbol || 'tokens'} before selling.
              </p>
              <button
                onClick={handleApproval}
                disabled={approving}
                className="w-full py-2 px-4 bg-warning hover:bg-warning/90 text-content-inverse rounded-md text-body-sm font-semibold transition-colors duration-base disabled:opacity-50"
              >
                {approving ? 'Approving...' : `Approve ${bondingTokenInfo?.symbol || agentData?.symbol || 'Tokens'}`}
              </button>
            </div>
          )}

          {/* Token Type Selector */}
          <div className="space-y-2">
            <label className="block text-caption font-medium text-content-muted">Token Type</label>
            <div className="flex bg-surface-elevated border border-border-subtle rounded-lg p-1">
              <button
                onClick={() => setTokenType('sentient')}
                className={`flex-1 py-2 px-4 rounded-md text-body-sm font-semibold border transition-colors duration-base ${
                  tokenType === 'sentient'
                    ? 'bg-accent-subtle text-accent border-accent/40'
                    : 'text-content-muted border-transparent hover:text-content-primary hover:bg-surface-hover'
                }`}
              >
                Sentient
              </button>
              <button
                onClick={() => setTokenType('prototype')}
                className={`flex-1 py-2 px-4 rounded-md text-body-sm font-semibold border transition-colors duration-base ${
                  tokenType === 'prototype'
                    ? 'bg-info-subtle text-info border-info-muted'
                    : 'text-content-muted border-transparent hover:text-content-primary hover:bg-surface-hover'
                }`}
              >
                Prototype
              </button>
            </div>
          </div>

          {/* Trade Button */}
          <button
            onClick={handleTrade}
            disabled={!isConnected || !quote || isTrading || parseFloat(amount) <= 0}
            className={`w-full py-3 px-4 rounded-lg text-body font-semibold transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'buy'
                ? 'bg-success hover:bg-success-hover text-content-inverse'
                : 'bg-danger hover:bg-danger-hover text-content-inverse'
            }`}
          >
            {!isConnected ? 'Connect Wallet' :
             isTrading ? 'Processing...' :
             showApproval && needsApproval ? 'Approve First' :
             `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${bondingTokenInfo?.symbol || agentData?.symbol || 'Tokens'}`}
          </button>
        </div>
      )}

      {/* Recent Trades */}
      <div className="space-y-3">
        <h3 className="text-heading-sm text-content-primary">Recent Trades</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={trade.id || index} className="bg-surface-elevated border border-border-subtle rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    trade.type === 'buy' || trade.type === 'tokensPurchased' ? 'bg-success' : 'bg-danger'
                  }`} />
                  <div>
                    <p className="text-body-sm text-content-primary font-medium">
                      {trade.type === 'buy' || trade.type === 'tokensPurchased' ? 'Buy' : 'Sell'}{' '}
                      {formatNumber(trade.amount || '0')} SOL
                    </p>
                    <p className="text-micro text-content-muted">
                      Price: {formatNumber(trade.price || '0')} SOL
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="text-micro text-content-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(typeof trade.timestamp === 'string' ? parseInt(trade.timestamp) : trade.timestamp)}
                  </p>
                  {(trade.txHash || trade.transactionHash) && (
                    <a
                      href={`https://explorer.solana.com/tx/${trade.txHash || trade.transactionHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover transition-colors duration-base"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Inbox}
              title="No recent trades"
              description="Recent trading activity will appear here."
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PumpTradingInterface;
