import React from 'react';

interface FilterBarProps {
  includeNsfw: boolean;
  sortBy: string;
  activeView: 'explore' | 'watchlist';
  onToggleNsfw: () => void;
  onSortChange: (sort: string) => void;
  onViewChange: (view: 'explore' | 'watchlist') => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  includeNsfw,
  sortBy,
  activeView,
  onToggleNsfw,
  onSortChange,
  onViewChange
}) => {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewChange('explore')}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors duration-base ${
              activeView === 'explore'
                ? 'bg-accent text-content-inverse'
                : 'bg-surface-card border border-border text-content-secondary hover:border-border-strong'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onViewChange('watchlist')}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors duration-base ${
              activeView === 'watchlist'
                ? 'bg-accent text-content-inverse'
                : 'bg-surface-card border border-border text-content-secondary hover:border-border-strong'
            }`}
          >
            Watchlist
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-content-muted text-body-sm">include nsfw:</span>
          <button
            onClick={onToggleNsfw}
            className={`px-3 py-1 rounded-lg text-body-sm font-medium transition-colors duration-base ${
              includeNsfw
                ? 'bg-accent text-content-inverse'
                : 'bg-surface-card border border-border text-content-secondary hover:border-border-strong'
            }`}
          >
            {includeNsfw ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-content-muted text-body-sm">sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-surface-card border border-border text-content-primary px-3 py-1 rounded-lg text-body-sm focus:outline-none focus:border-border-focus transition-colors duration-base"
          >
            <option value="featured">featured</option>
            <option value="newest">newest</option>
            <option value="market-cap">market cap</option>
            <option value="chats">most chats</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
