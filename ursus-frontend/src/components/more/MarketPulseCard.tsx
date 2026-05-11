import { useEffect, useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import apiService, { MarketAnalyticsResponse } from '../../services/api';
import { formatSol } from '../../utils/profile';

interface BucketRowProps {
  label: string;
  value: number;
  total: number;
}

function BucketRow({ label, value, total }: BucketRowProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#a0a0a0]">{label}</span>
        <span className="text-white font-mono">
          {value} <span className="text-[#666]">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#d8e9ea] to-[#b8d4d6] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MarketPulseCard() {
  const [data, setData] = useState<MarketAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiService.getMarketAnalytics('24h');
        if (!cancelled) setData(resp?.data ?? null);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-xl p-6 text-[#ef4444] text-sm">
        {error || 'Failed to load market analytics'}
      </div>
    );
  }

  const totalAgents =
    data.distribution.byMarketCap.micro +
    data.distribution.byMarketCap.small +
    data.distribution.byMarketCap.medium +
    data.distribution.byMarketCap.large;

  const priceChange = data.overview.avgPriceChange24h;
  const PriceIcon = priceChange >= 0 ? TrendingUp : TrendingDown;
  const priceColor = priceChange >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
          <BarChart3 size={16} className="text-black" />
        </div>
        <h3 className="text-white font-semibold">Market Pulse</h3>
      </div>

      {/* Overview grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Avg Price Change 24h</div>
          <div className={`flex items-center gap-1 font-semibold ${priceColor}`}>
            <PriceIcon size={14} />
            {priceChange >= 0 ? '+' : ''}
            {priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Unique Traders 24h</div>
          <div className="text-white font-semibold">
            {data.trends.uniqueTraders24h.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">New Agents 24h</div>
          <div className="text-white font-semibold">{data.trends.newAgents24h}</div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Total Volume 24h</div>
          <div className="text-white font-semibold">{formatSol(data.overview.totalVolume24h)}</div>
        </div>
      </div>

      {/* Market cap distribution */}
      <div className="mb-5">
        <h4 className="text-[#a0a0a0] text-xs uppercase mb-3">Market Cap Distribution</h4>
        <div className="space-y-2">
          <BucketRow label="Micro (<1 SOL)" value={data.distribution.byMarketCap.micro} total={totalAgents} />
          <BucketRow label="Small (1-10 SOL)" value={data.distribution.byMarketCap.small} total={totalAgents} />
          <BucketRow label="Medium (10-100 SOL)" value={data.distribution.byMarketCap.medium} total={totalAgents} />
          <BucketRow label="Large (>100 SOL)" value={data.distribution.byMarketCap.large} total={totalAgents} />
        </div>
      </div>

      {/* Age distribution */}
      <div>
        <h4 className="text-[#a0a0a0] text-xs uppercase mb-3">Agent Age</h4>
        <div className="space-y-2">
          <BucketRow label="New (24h)" value={data.distribution.byAge.new} total={totalAgents} />
          <BucketRow label="Recent (1-7d)" value={data.distribution.byAge.recent} total={totalAgents} />
          <BucketRow label="Established (7-30d)" value={data.distribution.byAge.established} total={totalAgents} />
          <BucketRow label="Mature (>30d)" value={data.distribution.byAge.mature} total={totalAgents} />
        </div>
      </div>
    </div>
  );
}

export default MarketPulseCard;
