import { useEffect, useState } from 'react';
import {
  Activity,
  Coins,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import apiService, { PlatformOverviewResponse } from '../../services/api';
import { formatSol } from '../../utils/profile';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'positive' | 'negative' | 'neutral';
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

function StatCard({ label, value, hint, hintTone = 'neutral', Icon }: StatCardProps) {
  const hintColor =
    hintTone === 'positive'
      ? 'text-[#10b981]'
      : hintTone === 'negative'
      ? 'text-[#ef4444]'
      : 'text-[#a0a0a0]';

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
          <Icon size={16} className="text-black" />
        </div>
        <span className="text-[#a0a0a0] text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-white text-2xl font-bold">{value}</div>
      {hint && <div className={`text-xs mt-1 ${hintColor}`}>{hint}</div>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-700 rounded-lg" />
            <div className="h-3 bg-gray-700 rounded w-20" />
          </div>
          <div className="h-6 bg-gray-700 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

export function PlatformStatsWidget() {
  const [data, setData] = useState<PlatformOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiService.getAnalyticsOverview();
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

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-xl p-5 text-[#ef4444] text-sm">
        {error || 'Failed to load platform stats'}
      </div>
    );
  }

  const totalAgents = data.platform.totalAgents;
  const totalUsers = data.platform.totalUsers;
  const tvlSol = parseFloat(data.platform.totalValueLocked || '0') || 0;
  const marketCapSol = parseFloat(data.platform.totalMarketCap || '0') || 0;
  const volume24hSol = parseFloat(data.growth.volume24h || '0') || 0;
  const volumeChange24h = parseFloat(data.growth.volumeChange24h || '0') || 0;
  const agentsCreated24h = data.growth.agentsCreated24h || 0;
  const uniqueTraders24h = data.growth.uniqueTraders24h || 0;
  const transactions24h = data.growth.transactions24h || 0;

  const volumeHintTone: StatCardProps['hintTone'] =
    volumeChange24h > 0 ? 'positive' : volumeChange24h < 0 ? 'negative' : 'neutral';
  const VolumeIcon = volumeChange24h >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Agents"
        value={totalAgents.toLocaleString()}
        hint={agentsCreated24h > 0 ? `+${agentsCreated24h} in 24h` : 'No new launches 24h'}
        hintTone={agentsCreated24h > 0 ? 'positive' : 'neutral'}
        Icon={Activity}
      />
      <StatCard
        label="Total Users"
        value={totalUsers.toLocaleString()}
        hint={uniqueTraders24h > 0 ? `${uniqueTraders24h} traders 24h` : undefined}
        Icon={Users}
      />
      <StatCard
        label="Total Market Cap"
        value={formatSol(marketCapSol)}
        hint={`${transactions24h.toLocaleString()} txs 24h`}
        Icon={Coins}
      />
      <StatCard
        label="Total Value Locked"
        value={formatSol(tvlSol)}
        hint="Bonding curve reserves"
        Icon={DollarSign}
      />
      <StatCard
        label="24h Volume"
        value={formatSol(volume24hSol)}
        hint={
          volumeChange24h !== 0
            ? `${volumeChange24h >= 0 ? '+' : ''}${volumeChange24h.toFixed(2)}% vs prev 24h`
            : undefined
        }
        hintTone={volumeHintTone}
        Icon={VolumeIcon}
      />
      <StatCard
        label="Creation Fee"
        value={formatSol(parseFloat(data.platform.creationFee || '0') || 0)}
        hint="Per new agent launch"
        Icon={Wallet}
      />
    </div>
  );
}

export default PlatformStatsWidget;
