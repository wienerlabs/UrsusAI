import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import apiService from '../../services/api';
import { formatSol } from '../../utils/profile';

interface LeaderRow {
  id: string;
  address: string;
  name: string;
  symbol: string;
  marketCap: number;
  priceChange24h: number;
  image: string;
}

function fallbackAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

export function TopAgentsLeaderboard() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiService.getTopAgents('marketCap', 5);
        const agents = resp?.data?.agents ?? [];
        const mapped: LeaderRow[] = agents.map((a) => {
          const mcRaw =
            (a.bondingCurveInfo?.marketCap as unknown as string | number | undefined) ??
            (a as unknown as { marketCap?: string | number }).marketCap ??
            0;
          return {
            id: a.id || a.address,
            address: a.address,
            name: a.tokenName || (a as unknown as { name?: string }).name || 'AI Agent',
            symbol: a.tokenSymbol || (a as unknown as { symbol?: string }).symbol || 'AGT',
            marketCap: parseFloat(String(mcRaw)) || 0,
            priceChange24h: Number(a.priceChange24h || 0),
            image: a.image || a.avatar || fallbackAvatar(a.address || a.id),
          };
        });
        if (!cancelled) setRows(mapped);
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
        <div className="h-5 bg-gray-700 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-xl p-6 text-[#ef4444] text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
          <Crown size={16} className="text-black" />
        </div>
        <h3 className="text-white font-semibold">Top Agents</h3>
      </div>

      {rows.length === 0 ? (
        <p className="text-[#a0a0a0] text-sm text-center py-6">
          No agents yet — be the first to launch.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, index) => {
            const priceColor =
              row.priceChange24h > 0
                ? 'text-[#10b981]'
                : row.priceChange24h < 0
                ? 'text-[#ef4444]'
                : 'text-[#a0a0a0]';
            return (
              <li key={row.id}>
                <Link
                  to={`/agent/${encodeURIComponent(row.address)}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
                >
                  <span className="text-[#666] font-mono text-sm w-6 shrink-0">
                    #{index + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] shrink-0">
                    <img
                      src={row.image}
                      alt={`${row.name} logo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackAvatar(row.address);
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{row.name}</div>
                    <div className="text-[#a0a0a0] text-xs">{row.symbol}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white font-medium text-sm">
                      {formatSol(row.marketCap)}
                    </div>
                    <div className={`text-xs font-medium ${priceColor}`}>
                      {row.priceChange24h >= 0 ? '+' : ''}
                      {row.priceChange24h.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default TopAgentsLeaderboard;
