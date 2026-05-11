import { useEffect, useState } from 'react';
import { Check, Copy, Globe } from 'lucide-react';
import apiService, { NetworkInfoResponse } from '../../services/api';
import { copyToClipboard, truncateWallet } from '../../utils/profile';

function clusterBadgeClasses(cluster: string): string {
  const lower = cluster.toLowerCase();
  if (lower.includes('mainnet')) return 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30';
  if (lower.includes('devnet')) return 'bg-[#d8e9ea]/10 text-[#d8e9ea] border-[#d8e9ea]/30';
  if (lower.includes('testnet')) return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30';
  return 'bg-[#2a2a2a] text-[#a0a0a0] border-[#3a3a3a]';
}

export function NetworkStatusCard() {
  const [data, setData] = useState<NetworkInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedProgram, setCopiedProgram] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiService.getNetworkInfo();
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

  const handleCopyProgram = async (address: string) => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopiedProgram(true);
      window.setTimeout(() => setCopiedProgram(false), 1500);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-40 mb-4" />
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
        {error || 'Failed to load network info'}
      </div>
    );
  }

  const epochProgress =
    data.network.epochInfo.slotsInEpoch > 0
      ? (data.network.epochInfo.slotIndex / data.network.epochInfo.slotsInEpoch) * 100
      : 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
            <Globe size={16} className="text-black" />
          </div>
          <h3 className="text-white font-semibold">Network Status</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${clusterBadgeClasses(data.network.cluster)}`}
        >
          {data.network.name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Current Slot</div>
          <div className="text-white font-mono text-sm">
            {data.network.slot.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Version</div>
          <div className="text-white font-mono text-sm">{data.network.version}</div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Epoch</div>
          <div className="text-white font-mono text-sm">
            {data.network.epochInfo.epoch.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[#a0a0a0] text-xs uppercase mb-1">Epoch Progress</div>
          <div className="text-white font-mono text-sm">{epochProgress.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mb-5">
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#d8e9ea] to-[#b8d4d6] transition-all"
            style={{ width: `${Math.min(100, epochProgress)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#a0a0a0]">Program ID</span>
          <button
            type="button"
            onClick={() => handleCopyProgram(data.program.programId)}
            className="flex items-center gap-1 text-[#d8e9ea] hover:text-white font-mono transition-colors"
            aria-label="Copy program ID"
          >
            {truncateWallet(data.program.programId, 6, 6)}
            {copiedProgram ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#a0a0a0]">Factory PDA</span>
          <span className="text-[#a0a0a0] font-mono">
            {truncateWallet(data.program.factoryPda, 6, 6)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default NetworkStatusCard;
