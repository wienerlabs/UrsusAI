import { Activity, Award, DollarSign, Users } from 'lucide-react';
import { UserProfileStats } from '../../services/api';
import { formatCompactNumber, formatSol, formatUsd } from '../../utils/profile';

interface ProfileStatsProps {
  stats: UserProfileStats | null;
  loading: boolean;
  portfolioValue: number;
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

function StatCard({ label, value, hint, Icon }: StatCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-gradient-to-r from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
          <Icon size={16} className="text-black" />
        </div>
        <span className="text-[#a0a0a0] text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {hint && <div className="text-xs text-[#a0a0a0] mt-1">{hint}</div>}
    </div>
  );
}

export function ProfileStats({ stats, loading, portfolioValue }: ProfileStatsProps) {
  const placeholder = loading ? '—' : '0';

  const agentsCreated = stats ? stats.agentsCreated.toString() : placeholder;

  // Portfolio Value dynamic fallback chain:
  // 1. Live portfolioTotal from active holdings (current market value)
  // 2. Stats totalValue from Portfolio model
  // 3. Total traded volume in SOL (shows activity even when user has closed out)
  const activeHoldingsValue = portfolioValue || stats?.portfolio.totalValue || 0;
  const tradedVolumeSol = stats?.trading.totalVolumeSol ?? 0;

  let portfolioLabel = 'Portfolio Value';
  let portfolioDisplay: string;
  let portfolioHint: string | undefined;

  if (loading) {
    portfolioDisplay = '—';
  } else if (activeHoldingsValue > 0) {
    portfolioDisplay = formatUsd(activeHoldingsValue);
    const pnlPct = stats?.portfolio?.pnlPct ?? 0;
    portfolioHint =
      stats && stats.portfolio.totalInvested > 0
        ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% PnL`
        : undefined;
  } else if (tradedVolumeSol > 0) {
    // No open positions — surface all-time traded volume so the card stays meaningful.
    portfolioLabel = 'Traded Volume';
    portfolioDisplay = formatSol(tradedVolumeSol);
    portfolioHint = 'No active positions';
  } else {
    portfolioDisplay = formatUsd(0);
  }

  const totalTrades = stats ? formatCompactNumber(stats.trading.totalTrades) : placeholder;
  const reputation = stats?.reputation?.level || (loading ? '—' : 'Newcomer');
  const reputationScore = stats?.reputation?.score ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="Agents Created" value={agentsCreated} Icon={Users} />
      <StatCard
        label={portfolioLabel}
        value={portfolioDisplay}
        hint={portfolioHint}
        Icon={DollarSign}
      />
      <StatCard
        label="Total Trades"
        value={totalTrades}
        hint={
          stats
            ? `${formatCompactNumber(stats.trading.buys)} buys / ${formatCompactNumber(stats.trading.sells)} sells`
            : undefined
        }
        Icon={Activity}
      />
      <StatCard
        label="Reputation"
        value={reputation}
        hint={stats ? `Score ${reputationScore}` : undefined}
        Icon={Award}
      />
    </div>
  );
}

export default ProfileStats;
