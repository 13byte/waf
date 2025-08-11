import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Category } from '../types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onCategoryFilter: (categoryId: number | null) => void;
  categories: Category[];
  initialQuery?: string;
  initialCategoryId?: number | null;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onCategoryFilter,
  categories,
  initialQuery = '',
  initialCategoryId = null,
  placeholder = 'Search posts...'
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialCategoryId);
  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value ? parseInt(e.target.value) : null;
    setSelectedCategoryId(categoryId);
    onCategoryFilter(categoryId);
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedCategoryId(null);
    onSearch('');
    onCategoryFilter(null);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10 pr-10"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedCategoryId || ''}
          onChange={handleCategoryChange}
          className="input-field min-w-40"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {(query || selectedCategoryId) && (
          <button
            onClick={clearSearch}
            className="btn-secondary whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;