import React, { useState } from 'react';
import { Search, X, Loader2, BookOpen } from 'lucide-react';

interface SearchResult {
  title: string;
  author?: string;
  isbn?: string;
  source: string;
  description?: string;
  coverUrl?: string;
  rating?: number;
}

interface IntegrationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: SearchResult) => void;
  defaultSearchType?: 'title' | 'author' | 'isbn' | 'manga';
}

export const IntegrationSearchModal: React.FC<IntegrationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectBook,
  defaultSearchType = 'title'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'author' | 'isbn' | 'manga'>(defaultSearchType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResults([]);

      let endpoint = '/api/integrations/search/metadata';
      let body: any = {
        query: searchQuery,
        search_type: searchType === 'manga' ? 'series' : searchType
      };

      if (searchType === 'manga') {
        endpoint = '/api/integrations/search/manga';
        body = { series_name: searchQuery };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();

        if (searchType === 'manga') {
          // Format manga results
          const sources = data.sources || {};
          const formattedResults: SearchResult[] = [];

          Object.entries(sources).forEach(([source, sourceData]: any) => {
            if (Array.isArray(sourceData)) {
              sourceData.forEach(manga => {
                formattedResults.push({
                  title: manga.name || manga.title,
                  author: manga.author,
                  source: source,
                  description: manga.description,
                  coverUrl: manga.cover_url,
                  rating: manga.score
                });
              });
            } else if (sourceData && sourceData.name) {
              formattedResults.push({
                title: sourceData.name,
                author: sourceData.author,
                source: source,
                description: sourceData.description,
                coverUrl: sourceData.cover_url,
                rating: sourceData.score
              });
            }
          });

          setResults(formattedResults);
        } else {
          // Format book results
          const sources = data.sources || {};
          const formattedResults: SearchResult[] = [];

          Object.entries(sources).forEach(([source, sourceData]: any) => {
            if (Array.isArray(sourceData)) {
              sourceData.forEach(book => {
                formattedResults.push({
                  title: book.title,
                  author: book.authors?.[0] || book.author,
                  isbn: book.isbn13 || book.isbn,
                  source: source,
                  description: book.description,
                  coverUrl: book.image_url || book.cover_url,
                  rating: book.rating_avg || book.average_rating
                });
              });
            }
          });

          setResults(formattedResults);
        }

        if (formattedResults.length === 0) {
          setError('No results found. Try a different search.');
        }
      } else {
        setError('Search failed. Please try again.');
      }
    } catch (err) {
      setError('Error searching integrations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Books</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Controls */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="isbn">ISBN</option>
              <option value="manga">Manga Series</option>
            </select>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`Search by ${searchType}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <BookOpen className="w-12 h-12 mb-2 opacity-50" />
              <p>No results. Try searching for a book.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
              <p className="text-gray-600">Searching integrations...</p>
            </div>
          )}

          <div className="space-y-2 p-4">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelectBook(result);
                  onClose();
                }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition flex gap-3"
              >
                {result.coverUrl && (
                  <img
                    src={result.coverUrl}
                    alt={result.title}
                    className="w-12 h-16 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                  {result.author && (
                    <p className="text-sm text-gray-600 truncate">by {result.author}</p>
                  )}
                  {result.isbn && (
                    <p className="text-xs text-gray-500">ISBN: {result.isbn}</p>
                  )}
                  {result.rating && (
                    <p className="text-xs text-yellow-600">★ {result.rating.toFixed(1)}</p>
                  )}
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    From {result.source.replace(/_/g, ' ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
