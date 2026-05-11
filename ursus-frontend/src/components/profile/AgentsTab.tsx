import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Agent } from '../../types';
import { formatCompactNumber, formatUsd } from '../../utils/profile';

interface AgentsTabProps {
  agents: Agent[];
  loading: boolean;
  isOwner: boolean;
}

function fallbackAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

export function AgentsTab({ agents, loading, isOwner }: AgentsTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-pulse"
          >
            <div className="w-12 h-12 bg-gray-700 rounded-xl mb-4" />
            <div className="h-4 bg-gray-700 rounded mb-2" />
            <div className="h-3 bg-gray-700 rounded mb-4 w-3/4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
        <Users size={48} className="text-[#2a2a2a] mb-6" />
        <h3 className="text-2xl font-bold text-white mb-4">
          {isOwner ? 'No Agents Created Yet' : 'No agents yet'}
        </h3>
        <p className="text-gray-400 text-center max-w-md mb-8">
          {isOwner
            ? "You haven't created any AI agents yet. Deploy your first agent to start earning."
            : "This user hasn't created any agents yet."}
        </p>
        {isOwner && (
          <Link
            to="/create"
            className="bg-[#d8e9ea] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors"
          >
            Create Your First Agent
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => {
        const address = agent.address || agent.contractAddress || agent.id;
        const name = agent.tokenName || agent.name || 'AI Agent';
        const description = agent.agentInfo?.description || agent.description || '';
        const image = agent.image || agent.avatar || fallbackAvatar(address || name);
        const holders = agent.holders ?? 0;
        const marketCap = Number(agent.marketCap || 0);
        const chatCount = agent.chatCount ?? 0;
        const priceChange = Number(agent.priceChange24h ?? 0);
        const isActive = agent.metadata?.isActive ?? true;

        return (
          <Link
            key={address || name}
            to={`/agent/${encodeURIComponent(address || '')}`}
            aria-label={`Open ${name} details`}
            className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d8e9ea]"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={image}
                  alt={`${name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackAvatar(address || name);
                  }}
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-semibold truncate">{name}</h4>
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-[#10b981]/10 text-[#10b981]'
                      : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-sm mb-4 line-clamp-2">
              {description || 'AI Agent'}
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Market Cap</span>
                <span className="text-white">{formatUsd(marketCap)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Holders</span>
                <span className="text-white">{formatCompactNumber(holders)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Chats</span>
                <span className="text-white">{formatCompactNumber(chatCount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">24h</span>
                <span className={priceChange >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                  {priceChange >= 0 ? '+' : ''}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default AgentsTab;
