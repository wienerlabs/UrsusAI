import React, { useState, useMemo } from 'react';
import { Star, TrendingUp, TrendingDown, Eye, RefreshCw, ArrowUpDown } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { EmptyState } from './ui';

const WatchlistSection: React.FC = () => {
  const { watchlist, removeFromWatchlist, updateWatchlistItem, clearWatchlist } = useWatchlist();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'added' | 'name' | 'price' | 'change' | 'marketCap'>('added');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const formatPrice = (price: number) => {
    if (price === 0) return '0.00';
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(8);
    return price.toFixed(6);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    if (num < 0.01) return num.toFixed(4);
    return num.toFixed(2);
  };

  const formatChange = (change: number) => {
    const formatted = Math.abs(change).toFixed(2);
    return `${change >= 0 ? '+' : '-'}${formatted}%`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const refreshWatchlist = async () => {
    if (isRefreshing || watchlist.length === 0) return;

    setIsRefreshing(true);
    try {
      await Promise.all(
        watchlist.map(async (item) => {
          try {
            const [statsResponse, detailsResponse] = await Promise.all([
              apiService.getAgentStats(item.address),
              apiService.getAgentDetails(item.address)
            ]);

            if (statsResponse?.data && detailsResponse?.data) {
              updateWatchlistItem(item.address, {
                currentPrice: parseFloat(statsResponse.data.currentPrice || '0'),
                priceChange24h: parseFloat(statsResponse.data.priceChange24h || '0'),
                marketCap: parseFloat(statsResponse.data.marketCap || '0'),
                tokenName: detailsResponse.data.tokenName || item.tokenName,
                tokenSymbol: detailsResponse.data.tokenSymbol || item.tokenSymbol,
                avatar: detailsResponse.data.avatar || detailsResponse.data.image || item.avatar
              });
            }
          } catch (error) {
            console.error(`Failed to update watchlist item ${item.address}:`, error);
          }
        })
      );
    } catch (error) {
      console.error('Failed to refresh watchlist:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sortedWatchlist = useMemo(() => {
    const sorted = [...watchlist];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.tokenName.localeCompare(b.tokenName));
      case 'price':
        return sorted.sort((a, b) => b.currentPrice - a.currentPrice);
      case 'change':
        return sorted.sort((a, b) => b.priceChange24h - a.priceChange24h);
      case 'marketCap':
        return sorted.sort((a, b) => b.marketCap - a.marketCap);
      case 'added':
      default:
        return sorted.sort((a, b) => b.addedAt - a.addedAt);
    }
  }, [watchlist, sortBy]);

  const watchlistStats = useMemo(() => {
    if (watchlist.length === 0) return null;

    const totalValue = watchlist.reduce((sum, item) => sum + item.marketCap, 0);
    const avgChange = watchlist.reduce((sum, item) => sum + item.priceChange24h, 0) / watchlist.length;
    const gainers = watchlist.filter(item => item.priceChange24h > 0).length;
    const losers = watchlist.filter(item => item.priceChange24h < 0).length;

    return { totalValue, avgChange, gainers, losers };
  }, [watchlist]);

  if (watchlist.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-lg text-content-primary flex items-center gap-2">
            <Star size={20} className="text-accent" />
            Watchlist
          </h2>
        </div>
        <div className="bg-surface-card border border-border rounded-xl">
          <EmptyState
            icon={Star}
            title="Your watchlist is empty"
            description="Click the star icon on any agent to add it to your watchlist"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-lg text-content-primary flex items-center gap-2">
          <Star size={20} className="text-accent" />
          Watchlist ({watchlist.length})
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-content-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-card border border-border text-content-primary text-body-sm px-2 py-1 rounded-lg focus:border-border-focus focus:outline-none transition-colors duration-base"
            >
              <option value="added">Recently Added</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="change">24h Change</option>
              <option value="marketCap">Market Cap</option>
            </select>
          </div>
          <button
            onClick={refreshWatchlist}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-border hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed text-content-primary text-body-sm rounded-lg transition-colors duration-base"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </button>
          {watchlist.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-danger-subtle hover:bg-danger-muted text-danger text-body-sm rounded-lg transition-colors duration-base"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Watchlist Stats */}
      {watchlistStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-card border border-border rounded-lg p-3">
            <div className="text-content-muted text-caption mb-1">Total Market Cap</div>
            <div className="text-content-primary font-semibold">${formatNumber(watchlistStats.totalValue)}</div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-3">
            <div className="text-content-muted text-caption mb-1">Avg 24h Change</div>
            <div className={`font-semibold ${watchlistStats.avgChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatChange(watchlistStats.avgChange)}
            </div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-3">
            <div className="text-content-muted text-caption mb-1">Gainers</div>
            <div className="text-success font-semibold">{watchlistStats.gainers}</div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-3">
            <div className="text-content-muted text-caption mb-1">Losers</div>
            <div className="text-danger font-semibold">{watchlistStats.losers}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedWatchlist.map((item) => (
          <div
            key={item.address}
            className="bg-surface-card border border-border rounded-xl p-4 hover:border-border-strong transition-colors duration-base cursor-pointer group"
            onClick={() => navigate(`/agent/${item.address}`)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={item.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.address}`}
                  alt={item.tokenName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="text-content-primary font-medium text-body-sm truncate max-w-[120px]">
                    {item.tokenName}
                  </h3>
                  <p className="text-content-muted text-caption">{item.tokenSymbol}</p>
                  <p className="text-content-subtle text-caption">Added {formatTimeAgo(item.addedAt)}</p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(item.address);
                }}
                className="p-1 hover:bg-surface-hover rounded transition-colors duration-base opacity-0 group-hover:opacity-100"
              >
                <Star size={16} className="text-accent fill-current" />
              </button>
            </div>

            {/* Price Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-content-muted text-caption">Price</span>
                <span className="text-content-primary text-body-sm font-medium">
                  ${formatPrice(item.currentPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-content-muted text-caption">24h Change</span>
                <div className="flex items-center gap-1">
                  {item.priceChange24h >= 0 ? (
                    <TrendingUp size={12} className="text-success" />
                  ) : (
                    <TrendingDown size={12} className="text-danger" />
                  )}
                  <span className={`text-caption font-medium ${
                    item.priceChange24h >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {formatChange(item.priceChange24h)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-content-muted text-caption">Market Cap</span>
                <span className="text-content-primary text-body-sm">
                  ${formatNumber(item.marketCap)}
                </span>
              </div>

              {/* Performance Indicator */}
              <div className="pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-content-muted text-caption">Performance</span>
                  <div className={`px-2 py-1 rounded text-caption font-medium ${
                    item.priceChange24h >= 10 ? 'bg-success-subtle text-success' :
                    item.priceChange24h >= 0 ? 'bg-success-subtle text-success' :
                    item.priceChange24h >= -10 ? 'bg-danger-subtle text-danger' :
                    'bg-danger-subtle text-danger'
                  }`}>
                    {item.priceChange24h >= 10 ? 'Hot' :
                      item.priceChange24h >= 0 ? 'Up' :
                        item.priceChange24h >= -10 ? 'Down' :
                          'Volatile'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-base">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agent/${item.address}`);
                }}
                className="flex-1 bg-surface-elevated hover:bg-surface-hover text-content-primary text-caption py-2 px-3 rounded-lg transition-colors duration-base flex items-center justify-center gap-1"
              >
                <Eye size={12} />
                View
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agent/${item.address}/trade`);
                }}
                className="flex-1 bg-accent hover:bg-accent-hover text-content-inverse text-caption py-2 px-3 rounded-lg transition-colors duration-base font-medium"
              >
                Trade
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-card border border-border rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-content-primary text-heading-sm mb-3">Clear Watchlist</h3>
            <p className="text-content-muted text-body-sm mb-6">
              Are you sure you want to remove all {watchlist.length} items from your watchlist? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-surface-elevated hover:bg-surface-hover text-content-primary rounded-lg transition-colors duration-base text-body-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearWatchlist();
                  setShowClearConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-danger-subtle hover:bg-danger-muted text-danger rounded-lg transition-colors duration-base text-body-sm font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchlistSection;
