import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import apiService, { CategoryAnalyticsResponse } from '../../services/api';
import { formatSol } from '../../utils/profile';

export function CategoryBreakdownCard() {
  const [data, setData] = useState<CategoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiService.getCategoryAnalytics();
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
        <div className="h-5 bg-gray-700 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-xl p-6 text-[#ef4444] text-sm">
        {error || 'Failed to load category analytics'}
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
            <Layers size={16} className="text-black" />
          </div>
          <h3 className="text-white font-semibold">Category Breakdown</h3>
        </div>
        <div className="text-right">
          <div className="text-[#a0a0a0] text-xs uppercase">Total</div>
          <div className="text-white font-semibold text-sm">
            {data.summary.totalAgents} agents
          </div>
        </div>
      </div>

      {data.categories.length === 0 ? (
        <p className="text-[#a0a0a0] text-sm text-center py-6">No categories yet.</p>
      ) : (
        <div className="space-y-3">
          {data.categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/discover?category=${encodeURIComponent(cat.name)}`}
              className="block bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{cat.name}</span>
                  <span className="text-xs text-[#a0a0a0]">
                    {cat.count} {cat.count === 1 ? 'agent' : 'agents'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">
                    {formatSol(cat.totalMarketCap)}
                  </div>
                  <div className="text-[#a0a0a0] text-xs">{cat.marketShare.toFixed(1)}% share</div>
                </div>
              </div>

              <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d8e9ea] to-[#b8d4d6]"
                  style={{ width: `${Math.min(100, cat.marketShare)}%` }}
                />
              </div>

              {cat.topAgents.length > 0 && (
                <div className="mt-2 text-xs text-[#a0a0a0] truncate">
                  Top: {cat.topAgents.map((a) => a.symbol || a.name).join(' · ')}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryBreakdownCard;
