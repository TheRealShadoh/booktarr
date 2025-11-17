'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

export interface SearchFilters {
  query?: string;
  author?: string;
  year?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
  };
  status?: 'owned' | 'wanted' | 'missing' | 'all';
  readingStatus?: 'want_to_read' | 'currently_reading' | 'finished' | 'dnf' | 'on_hold' | 'all';
  format?: string;
  genres?: string[];
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

export function AdvancedSearch({ onSearch, initialFilters = {} }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    onSearch({});
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => key !== 'query' && filters[key as keyof SearchFilters] !== undefined
  ).length;

  return (
    <div className="space-y-4">
      {/* Search bar with filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books, authors, series..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full p-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Search Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              {/* Author filter */}
              <div className="space-y-2">
                <Label>Author</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Author name..."
                    value={filters.author || ''}
                    onChange={(e) => updateFilter('author', e.target.value)}
                  />
                  {filters.author && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearFilter('author')}
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Ownership status filter */}
              <div className="space-y-2">
                <Label>Ownership Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="wanted">Wanted</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reading status filter */}
              <div className="space-y-2">
                <Label>Reading Status</Label>
                <Select
                  value={filters.readingStatus || 'all'}
                  onValueChange={(v) => updateFilter('readingStatus', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="want_to_read">Want to Read</SelectItem>
                    <SelectItem value="currently_reading">Currently Reading</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="dnf">Did Not Finish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating filter */}
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <div className="space-y-2">
                  <Slider
                    min={0}
                    max={5}
                    step={0.5}
                    value={[filters.rating?.min || 0]}
                    onValueChange={([value]) =>
                      updateFilter('rating', value > 0 ? { min: value } : undefined)
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Any</span>
                    <span>{filters.rating?.min || 0} stars</span>
                  </div>
                </div>
              </div>

              {/* Year filter */}
              <div className="space-y-2">
                <Label>Publication Year</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="From"
                    value={filters.year?.min || ''}
                    onChange={(e) =>
                      updateFilter('year', {
                        ...filters.year,
                        min: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="To"
                    value={filters.year?.max || ''}
                    onChange={(e) =>
                      updateFilter('year', {
                        ...filters.year,
                        max: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              {/* Format filter */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={filters.format || 'all'}
                  onValueChange={(v) => updateFilter('format', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="hardcover">Hardcover</SelectItem>
                    <SelectItem value="paperback">Paperback</SelectItem>
                    <SelectItem value="ebook">eBook</SelectItem>
                    <SelectItem value="audiobook">Audiobook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} className="w-full">
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.author && (
            <Badge variant="secondary" className="gap-1">
              Author: {filters.author}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('author')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('status')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.readingStatus && filters.readingStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Reading: {filters.readingStatus.replace('_', ' ')}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('readingStatus')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.rating && filters.rating.min && (
            <Badge variant="secondary" className="gap-1">
              Rating ≥ {filters.rating.min}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('rating')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.year && (filters.year.min || filters.year.max) && (
            <Badge variant="secondary" className="gap-1">
              Year: {filters.year.min || '...'} - {filters.year.max || '...'}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('year')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.format && filters.format !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Format: {filters.format}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('format')}
                className="h-auto p-0 px-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
