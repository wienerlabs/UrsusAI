import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, ExternalLink } from 'lucide-react';
import { useTradeEvents } from '../hooks/useWebSocket';
import { apiService } from '../services/api';
import { EmptyState } from './ui';

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  coreAmount: number;
  tokenAmount: number;
  timestamp: number;
  txHash?: string;
  trader?: string;
}

interface OrderBookProps {
  agentAddress: string;
  currentPrice?: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ agentAddress, currentPrice = 0 }) => {
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [volume24h, setVolume24h] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [volumeLabel, setVolumeLabel] = useState<'24h Volume' | 'Volume'>('24h Volume');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { latestTrade } = useTradeEvents(agentAddress);

  // Fetch recent trades + authoritative stats in parallel. The stats endpoint
  // is the source of truth for 24h volume / tx count; when that window is
  // empty, we fall back to the sum of the most recent trades so the panel
  // always reflects real activity.
  const fetchTrades = useCallback(async () => {
    if (!agentAddress) return;

    try {
      setError(null);

      const [tradesResponse, statsResponse] = await Promise.all([
        apiService.get(`/agents/${agentAddress}/trades?limit=50`),
        apiService.getAgentStats(agentAddress).catch(() => null),
      ]);

      const rawData = tradesResponse.data as any;
      const trades = rawData?.data || rawData?.trades || (Array.isArray(rawData) ? rawData : []);

      const mapped: Trade[] = trades.map((t: any, idx: number) => ({
        id: t.txHash || t.transactionHash || `trade-${idx}-${t.timestamp}`,
        type: (t.type || 'buy') as 'buy' | 'sell',
        price: parseFloat(t.price || '0'),
        coreAmount: parseFloat(t.coreAmount || '0'),
        tokenAmount: parseFloat(t.tokenAmount || '0'),
        timestamp: new Date(t.timestamp).getTime() || Date.now(),
        txHash: t.txHash || t.transactionHash,
        trader: t.trader || t.userAddress,
      }));

      setRecentTrades(mapped);

      // Prefer server-side 24h aggregate; fall back to sum of fetched trades.
      const statsData = (statsResponse as any)?.data ?? statsResponse ?? null;
      const serverVolume24h = parseFloat(String(statsData?.volume24h ?? 0)) || 0;
      const serverTx24h = parseInt(String(statsData?.transactions24h ?? 0), 10) || 0;
      const serverTotalTrades = parseInt(String(statsData?.totalTrades ?? 0), 10) || 0;

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const localRecent = mapped.filter(t => t.timestamp >= oneDayAgo);
      const localRecentVolume = localRecent.reduce((sum, t) => sum + t.coreAmount, 0);
      const localTotalVolume = mapped.reduce((sum, t) => sum + t.coreAmount, 0);

      if (serverVolume24h > 0 || serverTx24h > 0) {
        setVolume24h(serverVolume24h || localRecentVolume);
        setTradeCount(serverTx24h || localRecent.length);
        setVolumeLabel('24h Volume');
      } else if (localRecentVolume > 0) {
        setVolume24h(localRecentVolume);
        setTradeCount(localRecent.length);
        setVolumeLabel('24h Volume');
      } else {
        // No activity in the last 24h — show total from fetched history.
        setVolume24h(localTotalVolume);
        setTradeCount(serverTotalTrades || mapped.length);
        setVolumeLabel('Volume');
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError('Failed to load trade history');
    } finally {
      setLoading(false);
    }
  }, [agentAddress]);

  // Real-time trade updates
  useEffect(() => {
    if (latestTrade) {
      const price = parseFloat(latestTrade.price || '0');

      if (recentTrades.length > 0) {
        const lastPrice = recentTrades[0].price;
        if (price > lastPrice) setPriceDirection('up');
        else if (price < lastPrice) setPriceDirection('down');
        setTimeout(() => setPriceDirection('neutral'), 2000);
      }

      // Refetch to get the latest
      fetchTrades();
    }
  }, [latestTrade]);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 10000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '0';
    if (price < 0.000000001) return price.toExponential(3);
    if (price < 0.000001) return price.toFixed(10);
    if (price < 0.001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  };

  const formatAmount = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    if (amount >= 1e6) return (amount / 1e6).toFixed(2) + 'M';
    if (amount >= 1e3) return (amount / 1e3).toFixed(2) + 'K';
    if (amount >= 1) return amount.toFixed(2);
    if (amount >= 0.001) return amount.toFixed(4);
    return amount.toFixed(6);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h3 className="text-heading-sm text-content-primary">Trade History</h3>
        </div>
        <button
          onClick={fetchTrades}
          disabled={loading}
          className="p-1.5 text-content-muted hover:text-content-primary transition-colors duration-base disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Price Summary */}
      <div className="grid grid-cols-3 gap-px bg-border-subtle">
        <div className="bg-surface-card p-4">
          <div className="text-micro uppercase text-content-muted mb-1">Current Price</div>
          <div
            className={`text-body font-semibold transition-colors duration-base ${
              priceDirection === 'up'
                ? 'text-success'
                : priceDirection === 'down'
                ? 'text-danger'
                : 'text-content-primary'
            }`}
          >
            {formatPrice(currentPrice)} SOL
          </div>
        </div>
        <div className="bg-surface-card p-4">
          <div className="text-micro uppercase text-content-muted mb-1">{volumeLabel}</div>
          <div className="text-body font-semibold text-content-primary">
            {formatAmount(volume24h)} SOL
          </div>
        </div>
        <div className="bg-surface-card p-4">
          <div className="text-micro uppercase text-content-muted mb-1">Trades</div>
          <div className="text-body font-semibold text-content-primary">
            {tradeCount || recentTrades.length}
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="p-4">
        <div className="grid grid-cols-12 gap-2 text-micro uppercase text-content-muted pb-2 border-b border-border-subtle mb-2">
          <div className="col-span-2">Type</div>
          <div className="col-span-4">Price (SOL)</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-3 text-right">Time</div>
        </div>

        {loading && recentTrades.length === 0 ? (
          <div className="py-8 text-center">
            <RefreshCw className="w-5 h-5 animate-spin text-content-muted mx-auto mb-2" />
            <div className="text-body-sm text-content-muted">Loading trades...</div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <div className="text-body-sm text-danger mb-2">{error}</div>
            <button
              onClick={fetchTrades}
              className="text-caption text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        ) : recentTrades.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No trades yet"
            description="Trade history will appear here once buying or selling begins."
            size="sm"
          />
        ) : (
          <div className="space-y-0.5 max-h-96 overflow-y-auto">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="grid grid-cols-12 gap-2 items-center text-body-sm py-2 px-2 rounded-md hover:bg-surface-elevated transition-colors duration-base"
              >
                <div className="col-span-2">
                  <span
                    className={`text-micro font-semibold uppercase ${
                      trade.type === 'buy' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {trade.type}
                  </span>
                </div>
                <div
                  className={`col-span-4 font-mono text-body-sm ${
                    trade.type === 'buy' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {formatPrice(trade.price)}
                </div>
                <div className="col-span-3 text-right text-content-secondary font-mono text-body-sm">
                  {formatAmount(trade.coreAmount)}
                </div>
                <div className="col-span-3 text-right flex items-center justify-end gap-1.5 text-content-muted text-caption">
                  <span>{formatTime(trade.timestamp)}</span>
                  {trade.txHash && (
                    <a
                      href={`https://explorer.solana.com/tx/${trade.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-content-muted hover:text-accent transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {lastUpdate && recentTrades.length > 0 && (
          <div className="text-micro text-content-subtle text-right mt-3 pt-2 border-t border-border-subtle">
            Updated {formatTime(lastUpdate.getTime())}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderBook;
