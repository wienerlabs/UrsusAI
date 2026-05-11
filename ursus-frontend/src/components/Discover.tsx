import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownUp,
  ArrowLeft,
  Check,
  ChevronDown,
  Compass,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import useAgentDiscovery, { AgentFilters } from '../hooks/useAgentDiscovery';
import AgentGrid from './AgentGrid';
import { Agent } from '../types';

interface DiscoverProps {
  onBack: () => void;
}

type SortKey = 'marketCap' | 'volume24h' | 'priceChange24h' | 'createdAt' | 'totalChats';

interface SortOption {
  value: SortKey;
  label: string;
}

interface CategoryOption {
  value: string; // '' = all
  label: string;
}

// Matches backend Agent.category enum exactly.
const CATEGORIES: CategoryOption[] = [
  { value: '', label: 'All Categories' },
  { value: 'DeFi', label: 'DeFi' },
  { value: 'Trading', label: 'Trading' },
  { value: 'Analytics', label: 'Analytics' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Social', label: 'Social' },
  { value: 'Utility', label: 'Utility' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Education', label: 'Education' },
  { value: 'General', label: 'General' },
];

const SORT_OPTIONS: SortOption[] = [
  { value: 'marketCap', label: 'Top Market Cap' },
  { value: 'volume24h', label: 'Top Volume (24h)' },
  { value: 'priceChange24h', label: 'Top Gainers (24h)' },
  { value: 'createdAt', label: 'Newest First' },
  { value: 'totalChats', label: 'Most Active' },
];

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Discover({ onBack }: DiscoverProps) {
  const navigate = useNavigate();
  const {
    agents,
    loading,
    error,
    hasMore,
    totalAgents,
    setFilters,
    loadMore,
    sortAgents,
  } = useAgentDiscovery(20, { sortBy: 'marketCap', sortOrder: 'desc' });

  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [graduatedOnly, setGraduatedOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const debouncedSearch = useDebounced(searchInput, 300);

  // Server-side filter: category + search (re-fetches from API).
  useEffect(() => {
    const filters: AgentFilters = {
      category: category || undefined,
      search: debouncedSearch || undefined,
    };
    setFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debouncedSearch]);

  // Client-side sort + graduated filter applied on top of server results.
  const visibleAgents = useMemo(() => {
    let list = agents;
    if (graduatedOnly) {
      list = list.filter((a) => a.isActive === false);
    }
    return sortAgents(list, sortKey, 'desc');
  }, [agents, graduatedOnly, sortKey, sortAgents]);

  // Infinite scroll via IntersectionObserver on a sentinel element.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, loadMore]);

  const handleCardClick = useCallback(
    (agent: Agent) => {
      const address = agent.contractAddress || agent.address || agent.id;
      if (address) navigate(`/agent/${encodeURIComponent(address)}`);
    },
    [navigate]
  );

  const handleChatClick = useCallback(
    (agent: Agent) => {
      const address = agent.contractAddress || agent.address || agent.id;
      if (address) navigate(`/agent/${encodeURIComponent(address)}/chat`);
    },
    [navigate]
  );

  const handleTradeClick = useCallback(
    (agent: Agent) => {
      const address = agent.contractAddress || agent.address || agent.id;
      if (address) navigate(`/agent/${encodeURIComponent(address)}/trade`);
    },
    [navigate]
  );

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'Top Market Cap';

  return (
    <div className="min-h-screen bg-[#0a0a0a] md:ml-[200px]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a]">
        <div className="px-4 md:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors mb-4 text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
                  <Compass size={20} className="text-black" />
                </div>
                <h1 className="text-white text-3xl font-bold">Discover</h1>
              </div>
              <p className="text-[#a0a0a0] text-sm max-w-xl">
                Explore every AI agent on URSUS. Filter by category, sort by
                performance, and find your next edge.
              </p>
            </div>

            <div className="text-right">
              <div className="text-[#a0a0a0] text-xs uppercase">Total Agents</div>
              <div className="text-white text-2xl font-bold">
                {loading && totalAgents === 0 ? '—' : totalAgents.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Category sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <h3 className="text-[#a0a0a0] text-xs uppercase font-medium mb-3 px-2">
                Categories
              </h3>
              <ul className="space-y-1">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.value;
                  return (
                    <li key={cat.value || 'all'}>
                      <button
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          isActive
                            ? 'bg-[#d8e9ea] text-black font-medium'
                            : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {isActive && <Check size={14} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Main column */}
          <section className="min-w-0">
            {/* Controls */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Category chips (mobile) */}
              <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat.value;
                    return (
                      <button
                        key={cat.value || 'all'}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[#d8e9ea] text-black'
                            : 'bg-[#1a1a1a] text-[#a0a0a0] border border-[#2a2a2a]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search agents by name, symbol, or description…"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-9 py-2.5 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors text-sm"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm hover:border-[#3a3a3a] transition-colors w-full sm:w-auto justify-between"
                  >
                    <ArrowDownUp size={14} className="text-[#a0a0a0]" />
                    <span className="whitespace-nowrap">{activeSortLabel}</span>
                    <ChevronDown size={14} className="text-[#a0a0a0]" />
                  </button>
                  {sortOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSortOpen(false)}
                      />
                      <ul className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden min-w-[200px]">
                        {SORT_OPTIONS.map((opt) => {
                          const isActive = opt.value === sortKey;
                          return (
                            <li key={opt.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSortKey(opt.value);
                                  setSortOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                                  isActive
                                    ? 'bg-[#2a2a2a] text-white'
                                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]'
                                }`}
                              >
                                {opt.label}
                                {isActive && <Check size={14} />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>

                {/* Graduated toggle */}
                <button
                  type="button"
                  onClick={() => setGraduatedOnly((v) => !v)}
                  aria-pressed={graduatedOnly}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    graduatedOnly
                      ? 'bg-[#d8e9ea] text-black border-[#d8e9ea]'
                      : 'bg-[#1a1a1a] text-[#a0a0a0] border-[#2a2a2a] hover:border-[#3a3a3a]'
                  }`}
                >
                  <Sparkles size={14} />
                  Graduated
                </button>
              </div>

              {/* Active filter summary */}
              {(category || debouncedSearch || graduatedOnly) && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#a0a0a0]">Filters:</span>
                  {category && (
                    <button
                      type="button"
                      onClick={() => setCategory('')}
                      className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 py-1 rounded hover:border-[#3a3a3a]"
                    >
                      {category}
                      <X size={12} />
                    </button>
                  )}
                  {debouncedSearch && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 py-1 rounded hover:border-[#3a3a3a]"
                    >
                      "{debouncedSearch}"
                      <X size={12} />
                    </button>
                  )}
                  {graduatedOnly && (
                    <button
                      type="button"
                      onClick={() => setGraduatedOnly(false)}
                      className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 py-1 rounded hover:border-[#3a3a3a]"
                    >
                      Graduated only
                      <X size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      setSearchInput('');
                      setGraduatedOnly(false);
                    }}
                    className="text-[#a0a0a0] hover:text-white underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Error state */}
            {error && !loading && (
              <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-xl p-6 text-center mb-6">
                <p className="text-[#ef4444] mb-3">
                  Failed to load agents — {error.message}
                </p>
                <button
                  type="button"
                  onClick={() => setFilters({})}
                  className="bg-[#d8e9ea] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Grid */}
            <AgentGrid
              agents={visibleAgents}
              loading={loading && visibleAgents.length === 0}
              onCardClick={handleCardClick}
              onChatClick={handleChatClick}
              onTradeClick={handleTradeClick}
            />

            {/* Infinite scroll sentinel + load more fallback */}
            <div ref={sentinelRef} className="h-1" />
            {visibleAgents.length > 0 && hasMore && (
              <div className="flex justify-center py-8">
                {loading ? (
                  <div className="flex items-center gap-2 text-[#a0a0a0] text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Loading more…
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => loadMore()}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-5 py-2 rounded-lg text-sm hover:border-[#3a3a3a] transition-colors"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}

            {visibleAgents.length > 0 && !hasMore && !loading && (
              <div className="text-center py-8 text-[#666] text-sm">
                You've reached the end — {visibleAgents.length} agents shown
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Discover;
