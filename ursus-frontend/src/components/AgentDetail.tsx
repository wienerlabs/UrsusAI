import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Copy,
  Share2,
  Star,
  BarChart3,
  Activity,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { useAgentDetails, useAgentStats } from '../hooks/useAgents';
import { useWatchlist } from '../contexts/WatchlistContext';
import { TradingViewChart } from './TradingViewChart';
import OrderBook from './OrderBook';
import AgentChat from './AgentChat';
import { useGraduationStatus } from '../hooks/useGraduationStatus';
import { BondingCurveProgress } from './BondingCurveProgress';
import { useChartData } from '../hooks/useChartData';
import { X402PaymentPanel } from './X402PaymentPanel';
import EnhancedWalletConnect from './EnhancedWalletConnect';
import { apiService } from '../services/api';
import { EmptyState } from './ui';

interface ActivityTrade {
  timestamp: string;
  type: string;
  price: string;
  amount: string;
  coreAmount: string;
  tokenAmount: string;
  txHash?: string;
  userAddress?: string;
}


const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'overview' | 'trading' | 'activity' | 'chat' | 'x402'>('overview');
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Fetch agent data
  const { agent, loading, error } = useAgentDetails(id);
  // Graduation status for this agent
  const graduationStatus = useGraduationStatus(id || '', true);
  // Watchlist functionality
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const { stats } = useAgentStats(id);

  // Activity trades state
  const [activityTrades, setActivityTrades] = useState<ActivityTrade[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchActivityTrades = useCallback(async () => {
    const agentAddress = agent?.address || agent?.contractAddress || id;
    if (!agentAddress) return;
    setActivityLoading(true);
    try {
      const response = await apiService.getAgentTrades(agentAddress, 20);
      const rawData = response.data as any;
      const trades = rawData?.data || rawData?.trades || (Array.isArray(rawData) ? rawData : []);
      setActivityTrades(trades);
    } catch (err) {
      console.error('Failed to fetch activity trades:', err);
    } finally {
      setActivityLoading(false);
    }
  }, [agent?.address, agent?.contractAddress, id]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityTrades();
    }
  }, [activeTab, fetchActivityTrades]);

  // id kontrat adresi gibi davranıyor
  const { livePrice } = useChartData(agent?.address || id!, {
    interval: '1m',
    limit: 50,
    autoUpdate: true,
    enableRealTime: true,
  });

  // open modal automatically on /chat
  useEffect(() => {
    const onChatRoute = location.pathname.endsWith('/chat');
    setIsChatOpen(onChatRoute);
    if (onChatRoute) setActiveTab('chat');
  }, [location]);

  // Use real-time data if available
  const currentStats = stats;

  const handleCopyAddress = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWatchlistToggle = () => {
    if (!agent) return;

    const agentAddress = agent.address || agent.contractAddress || id || '';

    if (isInWatchlist(agentAddress)) {
      removeFromWatchlist(agentAddress);
    } else {
      addToWatchlist({
        address: agentAddress,
        tokenName: agent.tokenName || 'Unknown',
        tokenSymbol: agent.tokenSymbol || 'UNK',
        currentPrice: parseFloat(agent.currentPrice?.toString() || '0'),
        priceChange24h: currentStats?.priceChange24h || 0,
        marketCap: parseFloat(agent.bondingCurveInfo?.marketCap?.toString() || '0'),
        avatar: agent.image || agent.avatar
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num === 0) return '0.00';

    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;

    // Handle very small numbers
    if (num < 0.01) {
      return num.toFixed(6);
    }

    return num.toFixed(2);
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (numPrice === 0) return '0.000000000000';

    if (isNaN(numPrice)) return '0.000000000000';

    // Always use decimal format with appropriate precision based on value size
    if (numPrice < 0.000000000001) {
      return numPrice.toFixed(18);
    } else if (numPrice < 0.000000001) {
      return numPrice.toFixed(15);
    } else if (numPrice < 0.000001) {
      return numPrice.toFixed(12);
    } else if (numPrice < 0.001) {
      return numPrice.toFixed(9);
    } else if (numPrice < 1) {
      return numPrice.toFixed(6);
    } else {
      return numPrice.toFixed(4);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-content-muted text-body-sm">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger text-body mb-4">Agent not found</p>
          <button
            onClick={() => navigate('/')}
            className="bg-accent hover:bg-accent-hover text-content-inverse px-4 py-2 rounded-md font-semibold text-body-sm transition-colors duration-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface ml-[200px]">
      {/* Header */}
      <div className="border-b border-border bg-surface-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-content-muted hover:text-content-primary text-body-sm transition-colors duration-base"
            >
              <ArrowLeft size={20} />
              Back to Agents
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border text-content-secondary text-body-sm rounded-md hover:bg-surface-hover transition-colors duration-base"
              >
                <Copy size={16} />
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <button
                onClick={handleWatchlistToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-body-sm transition-colors duration-base ${
                  isInWatchlist(agent?.address || agent?.contractAddress || id || '')
                    ? 'bg-warning-subtle text-warning border border-warning-muted'
                    : 'bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover'
                }`}
              >
                <Star
                  size={16}
                  fill={isInWatchlist(agent?.address || agent?.contractAddress || id || '') ? 'currentColor' : 'none'}
                />
                {isInWatchlist(agent?.address || agent?.contractAddress || id || '') ? 'Watching' : 'Watch'}
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border text-content-secondary text-body-sm rounded-md hover:bg-surface-hover transition-colors duration-base">
                <Share2 size={16} />
                Share
              </button>
              <EnhancedWalletConnect />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Info */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Agent Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Header */}
            <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex items-start gap-6">
                <img
                  src={agent.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`}
                  alt={agent.tokenName}
                  className="w-20 h-20 rounded-lg bg-surface-elevated object-cover"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-heading-lg font-semibold text-content-primary">{agent.tokenName}</h1>
                    <span className="px-3 py-1 bg-accent text-content-inverse text-caption font-semibold rounded-md">
                      {agent.tokenSymbol}
                    </span>
                    <span
                      className={`px-3 py-1 text-caption rounded-md border ${
                        graduationStatus.isGraduated
                          ? 'bg-warning-subtle text-warning border-warning-muted'
                          : 'bg-info-subtle text-info border-info-muted'
                      }`}
                    >
                      {graduationStatus.isGraduated ? 'Graduated' : 'Bonding Curve Active'}
                    </span>
                    <span className="px-3 py-1 bg-surface-elevated border border-border text-content-muted text-caption rounded-md">
                      {agent.metadata?.category || 'General'}
                    </span>
                  </div>

                  <p className="text-content-secondary text-body mb-4 leading-relaxed">
                    {agent.agentInfo?.description || agent.description}
                  </p>

                  <div className="flex items-center gap-6 text-body-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-content-muted">Created by:</span>
                      <span className="text-accent font-medium">
                        {agent.metadata?.creator
                          ? `${agent.metadata.creator.slice(0, 6)}...${agent.metadata.creator.slice(-4)}`
                          : agent.creator
                          ? `${agent.creator.slice(0, 6)}...${agent.creator.slice(-4)}`
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-content-muted">Model:</span>
                      <span className="text-content-primary font-medium">
                        {agent.agentInfo?.model || agent.model || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-surface-card border border-border rounded-xl shadow-card">
              <div className="border-b border-border">
                <div className="flex overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 as any },
                    { id: 'trading', label: 'Trading', icon: TrendingUp as any },
                    { id: 'activity', label: 'Activity', icon: Activity as any },
                    { id: 'chat', label: 'Chat', icon: MessageCircle as any },
                    { id: 'x402', label: 'X402 Payments', icon: DollarSign as any }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-4 text-body-sm font-medium transition-colors duration-base ${
                        activeTab === (tab.id as any)
                          ? 'text-accent border-b-2 border-border-focus'
                          : 'text-content-muted hover:text-content-primary'
                      }`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-heading-sm font-semibold text-content-primary mb-3">Agent Instructions</h3>
                      <div className="bg-surface border border-border-subtle rounded-md p-4">
                        <p className="text-content-secondary text-body-sm leading-relaxed whitespace-pre-wrap">
                          {agent.agentInfo?.instructions || 'No specific instructions provided.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-heading-sm font-semibold text-content-primary mb-3">Price Chart</h3>
                      <TradingViewChart
                        agentAddress={agent?.address || id!}
                        tokenSymbol={agent?.tokenSymbol || 'TOKEN'}
                        className="w-full h-64"
                      />
                    </div>

                    {/* Bonding Curve Progress */}
                    <BondingCurveProgress
                      currentReserve={graduationStatus.currentReserve}
                      graduationThreshold={graduationStatus.graduationThreshold}
                      isGraduated={graduationStatus.isGraduated}
                      currentPrice={graduationStatus.currentPrice}
                      marketCap={graduationStatus.marketCap}
                      holders={agent?.holders || 0}
                      variant="compact"
                      className="mt-4"
                    />
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <h3 className="text-heading-sm font-semibold text-content-primary">Recent Activity</h3>
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : activityTrades.length > 0 ? (
                      <div className="space-y-2">
                        {activityTrades.map((trade, index) => (
                          <div key={trade.txHash || index} className="bg-surface border border-border-subtle rounded-md p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${trade.type === 'buy' ? 'bg-success' : 'bg-danger'}`} />
                              <div>
                                <p className="text-content-primary text-body-sm font-medium">
                                  {trade.type === 'buy' ? 'Buy' : 'Sell'}{' '}
                                  {formatNumber(parseFloat(trade.tokenAmount || '0'))} {agent.tokenSymbol}
                                </p>
                                <p className="text-content-muted text-micro">
                                  {formatNumber(parseFloat(trade.coreAmount || '0'))} SOL @ {formatPrice(trade.price)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <span className="text-content-muted text-micro">
                                {new Date(trade.timestamp).toLocaleString()}
                              </span>
                              {trade.txHash && (
                                <a
                                  href={`https://explorer.solana.com/tx/${trade.txHash}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:text-content-primary transition-colors duration-base"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Activity}
                        title="No trades yet"
                        description="Trade activity will appear here once trading begins."
                      />
                    )}
                  </div>
                )}

                {activeTab === 'trading' && (
                  <div className="space-y-6">
                    {/* Stats row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-surface border border-border-subtle rounded-md p-4">
                        <div className="text-caption uppercase text-content-muted mb-1">24h Volume</div>
                        <div className="text-heading-sm font-semibold text-content-primary">
                          {formatNumber(currentStats?.volume24h || 0)} SOL
                        </div>
                      </div>
                      <div className="bg-surface border border-border-subtle rounded-md p-4">
                        <div className="text-caption uppercase text-content-muted mb-1">24h Change</div>
                        <div
                          className={`text-heading-sm font-semibold ${
                            (currentStats?.priceChange24h || 0) >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {(currentStats?.priceChange24h || 0) >= 0 ? '+' : ''}
                          {Math.abs(currentStats?.priceChange24h || 0).toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-surface border border-border-subtle rounded-md p-4">
                        <div className="text-caption uppercase text-content-muted mb-1">Market Cap</div>
                        <div className="text-heading-sm font-semibold text-content-primary">
                          {formatPrice(agent?.bondingCurveInfo?.marketCap || 0)} SOL
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <TradingViewChart
                      agentAddress={agent?.address || id!}
                      tokenSymbol={agent?.tokenSymbol || 'TOKEN'}
                      className="w-full"
                    />

                    {/* Trade History - full width */}
                    <OrderBook
                      agentAddress={agent?.address || id!}
                      currentPrice={livePrice ?? parseFloat(String(agent?.currentPrice || '0'))}
                    />

                    {/* Open Trading Interface Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/agent/${id}/trade`)}
                        className="bg-accent hover:bg-accent-hover text-content-inverse px-8 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base"
                      >
                        Open Trading Interface
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <EmptyState
                    icon={MessageCircle}
                    title={`Chat with ${agent.tokenName}`}
                    description="Start a conversation with this AI agent"
                    action={{
                      label: 'Start Chat',
                      onClick: () => navigate(`/agent/${id}/chat`),
                    }}
                  />
                )}

                {activeTab === 'x402' && (
                  <X402PaymentPanel
                    agentAddress={agent.address || id || ''}
                    agentName={agent.tokenName || agent.name || ''}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Price Info */}
            <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="text-heading-sm font-semibold text-content-primary mb-4">Price Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-caption uppercase text-content-muted mb-1">Current Price</p>
                  <p className="text-heading-md font-semibold text-content-primary">
                    {formatPrice(livePrice ?? agent.currentPrice ?? 0)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-caption uppercase text-content-muted mb-1">24h Change</p>
                  <div
                    className={`flex items-center gap-1 ${
                      (currentStats?.priceChange24h || 0) >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {(currentStats?.priceChange24h || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span className="text-heading-sm font-semibold">
                      {Math.abs(currentStats?.priceChange24h || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-caption uppercase text-content-muted mb-1">Market Cap</p>
                  <p className="text-heading-sm font-semibold text-content-primary">
                    ${formatNumber(parseFloat(String(agent.bondingCurveInfo?.marketCap || '0')))}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="text-heading-sm font-semibold text-content-primary mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-caption uppercase text-content-muted">Total Supply</span>
                  <span className="text-heading-sm font-semibold text-content-primary">
                    {formatNumber(parseFloat(String(agent.totalSupply || '0')))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption uppercase text-content-muted">Holders</span>
                  <span className="text-heading-sm font-semibold text-content-primary">
                    {currentStats && currentStats.holders !== null ? currentStats.holders : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption uppercase text-content-muted">24h Volume</span>
                  <span className="text-heading-sm font-semibold text-content-primary">
                    ${formatNumber(currentStats?.volume24h || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption uppercase text-content-muted">24h Transactions</span>
                  <span className="text-heading-sm font-semibold text-content-primary">{currentStats?.transactions24h || 0}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="text-heading-sm font-semibold text-content-primary mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/agent/${id}/trade`)}
                  className="w-full bg-accent hover:bg-accent-hover text-content-inverse py-3 rounded-md font-semibold text-body-sm transition-colors duration-base"
                >
                  Trade Tokens
                </button>
                <button
                  onClick={() => navigate(`/agent/${id}/chat`)}
                  className="w-full bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover py-3 rounded-md font-semibold text-body-sm transition-colors duration-base"
                >
                  Chat with Agent
                </button>
                <button
                  onClick={handleWatchlistToggle}
                  className={`w-full py-3 rounded-md font-semibold text-body-sm transition-colors duration-base flex items-center justify-center gap-2 ${
                    isInWatchlist(agent?.address || agent?.contractAddress || id || '')
                      ? 'bg-warning-subtle text-warning border border-warning-muted'
                      : 'bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover'
                  }`}
                >
                  <Star size={18} fill={isInWatchlist(agent?.address || agent?.contractAddress || id || '') ? 'currentColor' : 'none'} />
                  {isInWatchlist(agent?.address || agent?.contractAddress || id || '') ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {agent && (
        <AgentChat
          agentAddress={agent.address || id || ''}
          agentName={agent.tokenName || agent.name || ''}
          agentInstructions={agent.agentInfo?.instructions}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            if (location.pathname.endsWith('/chat')) {
              navigate(`/agent/${id}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default AgentDetail;
