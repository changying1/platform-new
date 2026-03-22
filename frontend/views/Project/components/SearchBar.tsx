import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}

export function SearchBar({ searchQuery, onSearchChange, onSearch }: SearchBarProps) {
  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="搜索项目名称..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        onClick={onSearch}
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
      >
        搜索
      </button>
    </div>
  );
}
