import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Agent } from '../types';
import { formatMarketCap, formatTimeAgo } from '../utils/formatters';

interface TrendingSectionProps {
  trendingAgents: Agent[];
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ trendingAgents }) => {
  const navigate = useNavigate();

  const handleAgentClick = (agent: Agent) => {
    const agentAddress = agent.contractAddress || agent.address || agent.id;
    navigate(`/agent/${agentAddress}`);
  };

  return (
    <div className="mb-8">
      <h2 className="text-heading-lg text-content-primary mb-4">Now trending</h2>

      {trendingAgents.length === 0 ? (
        <div className="flex items-center justify-center py-12 bg-surface-card border border-border rounded-xl">
          <div className="text-center">
            <p className="text-content-muted text-body-sm">No trending agents yet</p>
            <p className="text-content-subtle text-caption mt-1">Deploy agents to see trending activity</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {trendingAgents.map((agent) => (
            <div
              key={agent.id}
              className="relative flex-shrink-0 w-[300px] h-[180px] bg-surface-card border border-border rounded-xl p-4 hover:border-border-strong transition-colors duration-base cursor-pointer"
              onClick={() => handleAgentClick(agent)}
            >
              {agent.bondingCurveInfo?.reserve && Number(agent.bondingCurveInfo.reserve) >= 30000 && (
                <div className="absolute top-3 right-3">
                  <span className="bg-warning-subtle text-warning text-micro px-2 py-0.5 rounded-md border border-border-subtle">Graduated</span>
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-elevated">
                  {agent.image ? (
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-elevated flex items-center justify-center text-content-primary font-bold">
                      {agent.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-content-primary font-medium">{agent.name}</span>
                    <span className="text-content-muted text-body-sm">({agent.symbol})</span>
                  </div>
                  <div className="text-success text-body-sm font-medium">
                    {formatMarketCap(agent.marketCap)}
                  </div>

                  {/* Bonding curve indicator */}
                  <div className="mt-1 w-24 bg-surface-elevated h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(((agent.bondingCurveInfo?.reserve as number || 0) / 30000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-content-secondary text-body-sm mb-3 line-clamp-3">
                {agent.description}
              </div>

              <div className="flex items-center justify-between text-content-muted text-caption">
                <span>{agent.chatCount} chats</span>
                <span>{formatTimeAgo(agent.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingSection;
