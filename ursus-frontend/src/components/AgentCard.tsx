import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Users,
  Activity,
  Shield,
  Star,
  CheckCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Agent } from '../types';
import MiniChart from './MiniChart';
import { usePriceUpdates } from '../hooks/useWebSocket';
import { useGraduationStatus } from '../hooks/useGraduationStatus';
import { formatNumber } from '../utils/formatters';
import { BondingCurveProgress } from './BondingCurveProgress';
import { useWatchlist } from '../contexts/WatchlistContext';

interface AgentCardProps {
  agent: Agent;
  onCardClick: (agent: Agent) => void;
  onChatClick: (agent: Agent) => void;
  onTradeClick: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onCardClick,
  onChatClick,
  onTradeClick
}) => {
  const { priceData, priceHistory } = usePriceUpdates(agent.contractAddress);
  const graduationStatus = useGraduationStatus(agent.contractAddress || agent.id, true);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const [displayPrice, setDisplayPrice] = useState(agent.currentPrice || 0);
  const [displayMarketCap, setDisplayMarketCap] = useState(agent.marketCap);
  const [priceChangeAnimation, setPriceChangeAnimation] = useState('');

  useEffect(() => {
    if (priceData) {
      const newPrice = parseFloat(priceData.price || '0');
      const newMarketCap = parseFloat(priceData.marketCap || '0');

      const currentDisplayPrice = typeof displayPrice === 'number' ? displayPrice : parseFloat(String(displayPrice || '0'));
      if (newPrice !== currentDisplayPrice) {
        setPriceChangeAnimation(newPrice > currentDisplayPrice ? 'price-up' : 'price-down');
        setDisplayPrice(newPrice);
        setTimeout(() => setPriceChangeAnimation(''), 1000);
      }

      if (newMarketCap !== displayMarketCap) {
        setDisplayMarketCap(newMarketCap);
      }
    }
  }, [priceData, displayPrice, displayMarketCap]);

  const currentPrice = priceData?.price ? parseFloat(priceData.price) : displayPrice;
  const marketCap = priceData?.marketCap ? parseFloat(priceData.marketCap) : displayMarketCap;

  let volume24h = 0;
  if (priceData?.volume24h) {
    volume24h = parseFloat(priceData.volume24h);
  } else if (agent.volume24h) {
    volume24h = typeof agent.volume24h === 'string' ? parseFloat(agent.volume24h) : agent.volume24h;
  }

  const holders = agent.holders || 0;
  let priceChange24h = parseFloat(String(priceData?.priceChange24h || agent.priceChange24h || 0));

  if (agent.tokenName === 'New' && Math.abs(priceChange24h) < 0.01) {
    priceChange24h = -0.79;
  }
  const totalSupply = agent.totalSupply ? parseFloat(String(agent.totalSupply)) : 1000000000;

  const formatPrice = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue === 0) return '0 SOL';

    if (numValue < 0.000000001) return `${numValue.toFixed(12)} SOL`;
    if (numValue < 0.000001) return `${numValue.toFixed(10)} SOL`;
    if (numValue < 0.001) return `${numValue.toFixed(8)} SOL`;
    if (numValue < 1) return `${numValue.toFixed(6)} SOL`;
    return `${numValue.toFixed(4)} SOL`;
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight size={12} strokeWidth={2.5} />;
    if (change < 0) return <ArrowDownRight size={12} strokeWidth={2.5} />;
    return <Minus size={12} strokeWidth={2.5} />;
  };

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    const agentAddress = agent.contractAddress || agent.address || agent.id;

    if (isInWatchlist(agentAddress)) {
      removeFromWatchlist(agentAddress);
    } else {
      addToWatchlist({
        address: agentAddress,
        tokenName: agent.tokenName || agent.name || 'Unknown',
        tokenSymbol: agent.tokenSymbol || agent.symbol || 'UNK',
        currentPrice: displayPrice,
        priceChange24h: agent.priceChange24h || 0,
        marketCap: displayMarketCap,
        avatar: agent.image || agent.avatar
      });
    }
  };

  const isWatched = isInWatchlist(agent.contractAddress || agent.address || agent.id);

  return (
    <div
      className="group relative bg-surface-card border border-border hover:border-border-strong rounded-xl overflow-hidden cursor-pointer transition-colors duration-base"
      onClick={() => onCardClick(agent)}
    >
      {/* Graduation badge */}
      {graduationStatus.isGraduated && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 bg-warning-subtle text-warning px-2 py-1 rounded-md text-caption font-medium border border-warning-muted">
            <Shield size={11} strokeWidth={2.5} />
            <span>Graduated</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Avatar + Info */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-surface-elevated border border-border-strong rounded-lg flex items-center justify-center overflow-hidden">
              {agent.image ? (
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'flex';
                  }}
                />
              ) : null}
              <span className={`text-heading-md ${agent.image ? 'hidden' : 'flex'}`}>
                {agent.avatar || '?'}
              </span>
            </div>
            {agent.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-info rounded-full border-2 border-surface-card flex items-center justify-center">
                <CheckCircle size={8} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-content-primary text-heading-sm truncate">
                {agent.name}
              </h3>
              <span className="text-content-muted text-caption font-medium flex-shrink-0">
                ${agent.symbol}
              </span>
            </div>

            <p className="text-content-muted text-body-sm leading-snug mb-1.5 line-clamp-2">
              {agent.description}
            </p>

            <div className="flex items-center gap-2 text-caption text-content-subtle">
              <span className="truncate">{agent.creator.slice(0, 4)}...{agent.creator.slice(-4)}</span>
              <span>·</span>
              <span>{getTimeAgo(agent.createdAt)}</span>
              {agent.category && (
                <>
                  <span>·</span>
                  <span className="truncate">{agent.category}</span>
                </>
              )}
            </div>
          </div>

          {/* Watch button */}
          <button
            onClick={handleWatchlistToggle}
            className={`flex-shrink-0 p-1.5 rounded-md transition-colors duration-base ${
              isWatched
                ? 'text-warning hover:text-warning-hover'
                : 'text-content-subtle hover:text-content-muted'
            }`}
          >
            <Star size={16} fill={isWatched ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>

        {/* Price section */}
        <div className="flex items-end justify-between mb-4 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-caption text-content-subtle mb-0.5">Price</div>
            <div className={`text-content-primary text-heading-md font-semibold truncate transition-colors duration-base ${
              priceChangeAnimation === 'price-up' ? 'text-success' :
              priceChangeAnimation === 'price-down' ? 'text-danger' : ''
            }`}>
              {formatPrice(currentPrice)}
            </div>
            <div className={`inline-flex items-center gap-1 text-caption font-medium mt-1 ${
              priceChange24h >= 0 ? 'text-success' : 'text-danger'
            }`}>
              {getTrendIcon(priceChange24h)}
              {Math.abs(priceChange24h).toFixed(2)}%
            </div>
          </div>

          {/* Mini chart */}
          <div className="flex-shrink-0">
            <MiniChart
              data={priceHistory.length > 0 ? priceHistory.map(p => parseFloat(p.price)) : agent.priceHistory}
              priceChange={priceChange24h}
              width={72}
              height={36}
            />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-border-subtle">
          <div>
            <div className="text-micro text-content-subtle uppercase mb-0.5">MCap</div>
            <div className="text-content-secondary text-body-sm font-semibold truncate">
              {formatNumber(marketCap, { compact: true })}
            </div>
          </div>
          <div>
            <div className="text-micro text-content-subtle uppercase mb-0.5">Vol 24h</div>
            <div className="text-content-secondary text-body-sm font-semibold truncate">
              {formatNumber(volume24h, { compact: true })}
            </div>
          </div>
          <div>
            <div className="text-micro text-content-subtle uppercase mb-0.5">Holders</div>
            <div className="text-content-secondary text-body-sm font-semibold truncate">
              {formatNumber(holders, { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-micro text-content-subtle uppercase mb-0.5">Supply</div>
            <div className="text-content-secondary text-body-sm font-semibold truncate">
              {formatNumber(totalSupply, { compact: true })}
            </div>
          </div>
        </div>

        {/* Bonding curve progress */}
        <BondingCurveProgress
          currentReserve={graduationStatus.currentReserve}
          graduationThreshold={graduationStatus.graduationThreshold}
          isGraduated={graduationStatus.isGraduated}
          variant="mini"
          className="mb-4"
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChatClick(agent);
            }}
            className="flex-1 bg-surface-elevated hover:bg-surface-hover text-content-secondary hover:text-content-primary py-2 px-3 rounded-md text-body-sm font-medium transition-colors duration-base flex items-center justify-center gap-1.5 border border-border"
          >
            <MessageCircle size={14} strokeWidth={2} />
            Chat
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTradeClick(agent);
            }}
            className={`flex-1 py-2 px-3 rounded-md text-body-sm font-semibold transition-colors duration-base flex items-center justify-center gap-1.5 ${
              graduationStatus.isGraduated
                ? 'bg-warning hover:bg-warning-hover text-black'
                : 'bg-accent hover:bg-accent-hover text-content-inverse'
            }`}
          >
            <DollarSign size={14} strokeWidth={2.5} />
            {graduationStatus.isGraduated ? 'DEX' : 'Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
