import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const SearchBar = ({ onSearch, placeholder = "Search radio stations..." }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-11 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {query && (
            <Button
              data-testid="clear-search"
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <Button
            data-testid="search-button"
            type="submit"
            size="sm"
            className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
