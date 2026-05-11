import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityFeedItem } from '../../services/api';
import { formatRelativeTime, formatSol, formatUsd } from '../../utils/profile';

interface ActivityTabProps {
  items: ActivityFeedItem[];
  loading: boolean;
}

function iconForType(item: ActivityFeedItem) {
  if (item.type === 'created') return Sparkles;
  if (item.type === 'milestone') return Trophy;
  if (item.type === 'trade') {
    const side = (item.meta?.side as string | undefined)?.toLowerCase();
    if (side === 'sell') return ArrowUpRight;
    return ArrowDownLeft;
  }
  return ActivityIcon;
}

function getTxHash(item: ActivityFeedItem): string | null {
  const raw = item.meta?.txHash;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function getAgentAddress(item: ActivityFeedItem): string | null {
  const raw = item.meta?.agentAddress;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

// Resolve explorer cluster from env so tx links match the active Solana network.
function explorerTxUrl(txHash: string): string {
  const rpcUrl = (import.meta.env.VITE_SOLANA_RPC_URL || '').toLowerCase();
  let cluster = 'devnet';
  if (rpcUrl.includes('mainnet')) cluster = 'mainnet-beta';
  else if (rpcUrl.includes('testnet')) cluster = 'testnet';
  return `https://explorer.solana.com/tx/${txHash}?cluster=${cluster}`;
}

export function ActivityTab({ items, loading }: ActivityTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-white text-xl font-semibold">Activity Feed</h3>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <ActivityIcon className="mx-auto text-[#2a2a2a] mb-3" size={32} />
          <p className="text-[#a0a0a0]">No activity yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = iconForType(item);
            const txHash = getTxHash(item);
            const agentAddress = getAgentAddress(item);

            return (
              <div
                key={item.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-white truncate">{item.message}</p>
                      {(() => {
                        const side = (item.meta?.side as string | undefined)?.toLowerCase();
                        const sol = Number(item.amountSol ?? 0);
                        const usd = Number(item.amount ?? 0);
                        if (!sol && !usd) return null;
                        const colorClass =
                          side === 'sell' ? 'text-[#ef4444]' : 'text-[#10b981]';
                        return (
                          <div className={`text-right whitespace-nowrap ${colorClass}`}>
                            {sol > 0 && (
                              <div className="font-medium">{formatSol(sol)}</div>
                            )}
                            {usd > 0 && (
                              <div className="text-xs opacity-80">{formatUsd(usd)}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
                      <span className="text-[#a0a0a0]">
                        {formatRelativeTime(item.timestamp)}
                      </span>

                      {agentAddress && (
                        <Link
                          to={`/agent/${encodeURIComponent(agentAddress)}`}
                          className="text-[#a0a0a0] hover:text-[#d8e9ea] transition-colors"
                        >
                          View agent
                        </Link>
                      )}

                      {txHash && (
                        <a
                          href={explorerTxUrl(txHash)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 font-mono text-xs text-[#d8e9ea] hover:text-white transition-colors"
                          title={txHash}
                        >
                          <ExternalLink size={12} />
                          {truncateHash(txHash)}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActivityTab;
