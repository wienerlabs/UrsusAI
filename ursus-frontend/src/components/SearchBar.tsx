import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-8">
      <div className="relative flex-1 max-w-[400px] bg-surface-card border border-border rounded-lg focus-within:border-border-focus transition-colors duration-base">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents..."
          className="w-full h-10 bg-transparent rounded-lg px-4 pr-10 text-content-primary placeholder-content-muted focus:outline-none text-body-sm"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-content-muted" size={16} />
      </div>
      <button
        type="submit"
        className="bg-accent text-content-inverse px-6 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-colors duration-base text-body-sm"
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;
