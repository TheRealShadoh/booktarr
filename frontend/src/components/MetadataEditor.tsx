import React, { useState, useEffect } from 'react';

interface MetadataSearchResult {
  title: string;
  authors: string[];
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  release_date?: string;
  page_count?: number;
  description?: string;
  cover_url?: string;
  source: string;
  series_name?: string;
  series_position?: number;
}

interface MetadataEditorProps {
  type: 'book' | 'volume';
  itemId: number;
  seriesName?: string;
  position?: number;
  currentData: any;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  type,
  itemId,
  seriesName,
  position,
  currentData,
  onClose,
  onUpdate
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'author' | 'isbn'>('title');
  const [searchResults, setSearchResults] = useState<MetadataSearchResult[]>([]);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualData, setManualData] = useState(currentData);

  useEffect(() => {
    setManualData(currentData);
    // Pre-populate search with current title
    if (currentData?.title) {
      setSearchQuery(currentData.title);
    }
  }, [currentData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        search_type: searchType,
        max_results: '10'
      });

      const response = await fetch(`/api/series/search-metadata?${params}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results);
      } else {
        console.error('Search failed:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching metadata:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const applyMetadata = async (metadata: MetadataSearchResult) => {
    try {
      let endpoint = '';
      if (type === 'book') {
        endpoint = `/api/books/${itemId}/apply-metadata`;
      } else {
        endpoint = `/api/series/${encodeURIComponent(seriesName!)}/volumes/${position}/apply-metadata`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      const result = await response.json();
      if (result.success) {
        onUpdate(result);
        onClose();
      } else {
        console.error('Failed to apply metadata:', result);
      }
    } catch (error) {
      console.error('Error applying metadata:', error);
    }
  };

  const saveManualChanges = async () => {
    try {
      let endpoint = '';
      let method = 'PUT';

      if (type === 'book') {
        endpoint = `/api/books/${itemId}/metadata`;
      } else {
        endpoint = `/api/series/${encodeURIComponent(seriesName!)}/volumes/${position}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualData),
      });

      const result = await response.json();
      if (result.success) {
        onUpdate(result);
        onClose();
      } else {
        console.error('Failed to save manual changes:', result);
      }
    } catch (error) {
      console.error('Error saving manual changes:', error);
    }
  };

  const handleManualFieldChange = (field: string, value: any) => {
    setManualData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-booktarr-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-booktarr-border">
        <div className="flex justify-between items-center p-6 border-b border-booktarr-border">
          <h2 className="text-xl font-semibold text-booktarr-text">
            Edit {type === 'book' ? 'Book' : 'Volume'} Metadata
          </h2>
          <button
            onClick={onClose}
            className="text-booktarr-textMuted hover:text-booktarr-text text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsManualEdit(false)}
              className={`px-4 py-2 rounded transition-colors ${
                !isManualEdit
                  ? 'bg-booktarr-accent text-white'
                  : 'bg-booktarr-surface2 text-booktarr-text border border-booktarr-border hover:bg-booktarr-hover'
              }`}
            >
              Search Metadata
            </button>
            <button
              onClick={() => setIsManualEdit(true)}
              className={`px-4 py-2 rounded transition-colors ${
                isManualEdit
                  ? 'bg-booktarr-accent text-white'
                  : 'bg-booktarr-surface2 text-booktarr-text border border-booktarr-border hover:bg-booktarr-hover'
              }`}
            >
              Manual Edit
            </button>
          </div>

          {!isManualEdit ? (
            <>
              {/* Search Section */}
              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for metadata..."
                    className="flex-1 px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="isbn">ISBN</option>
                  </select>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-booktarr-accent text-white rounded-md hover:bg-booktarr-accent/90 disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-booktarr-text">Search Results</h3>
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="border border-booktarr-border rounded-lg p-4 hover:bg-booktarr-hover bg-booktarr-surface2"
                    >
                      <div className="flex gap-4">
                        {result.cover_url && (
                          <img
                            src={result.cover_url}
                            alt={result.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-lg text-booktarr-text">{result.title}</h4>
                          <p className="text-booktarr-textMuted">
                            by {result.authors?.join(', ') || 'Unknown Author'}
                          </p>
                          {result.publisher && (
                            <p className="text-sm text-booktarr-textMuted">
                              {result.publisher}
                              {result.release_date && ` • ${result.release_date}`}
                            </p>
                          )}
                          {result.isbn_13 && (
                            <p className="text-sm text-booktarr-textMuted">
                              ISBN: {result.isbn_13}
                            </p>
                          )}
                          {result.series_name && (
                            <p className="text-sm text-booktarr-accent">
                              Series: {result.series_name}
                              {result.series_position && ` #${result.series_position}`}
                            </p>
                          )}
                          <p className="text-xs text-booktarr-textMuted/60 mt-1">
                            Source: {result.source}
                          </p>
                          {result.description && (
                            <p className="text-sm text-booktarr-textMuted mt-2 line-clamp-3">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => applyMetadata(result)}
                          className="px-4 py-2 bg-booktarr-accent text-white rounded-md hover:bg-booktarr-accent/90 self-start"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Manual Edit Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-booktarr-text">Manual Edit</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={manualData?.title || ''}
                      onChange={(e) => handleManualFieldChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>

                  {type === 'book' && (
                    <div>
                      <label className="block text-sm font-medium text-booktarr-text mb-1">
                        Authors (comma separated)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(manualData?.authors) ? manualData.authors.join(', ') : manualData?.authors || ''}
                        onChange={(e) => handleManualFieldChange('authors', e.target.value.split(',').map(a => a.trim()))}
                        className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      ISBN-13
                    </label>
                    <input
                      type="text"
                      value={manualData?.isbn_13 || ''}
                      onChange={(e) => handleManualFieldChange('isbn_13', e.target.value)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={manualData?.publisher || ''}
                      onChange={(e) => handleManualFieldChange('publisher', e.target.value)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Published Date
                    </label>
                    <input
                      type="date"
                      value={manualData?.published_date || manualData?.release_date || ''}
                      onChange={(e) => handleManualFieldChange('published_date', e.target.value)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Cover URL
                    </label>
                    <input
                      type="url"
                      value={manualData?.cover_url || ''}
                      onChange={(e) => handleManualFieldChange('cover_url', e.target.value)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>

                  {type === 'book' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-booktarr-text mb-1">
                          Series Name
                        </label>
                        <input
                          type="text"
                          value={manualData?.series_name || ''}
                          onChange={(e) => handleManualFieldChange('series_name', e.target.value)}
                          className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-booktarr-text mb-1">
                          Series Position
                        </label>
                        <input
                          type="number"
                          value={manualData?.series_position || ''}
                          onChange={(e) => handleManualFieldChange('series_position', parseInt(e.target.value) || null)}
                          className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        />
                      </div>
                    </>
                  )}
                </div>

                {type === 'volume' && (
                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Page Count
                    </label>
                    <input
                      type="number"
                      value={manualData?.page_count || ''}
                      onChange={(e) => handleManualFieldChange('page_count', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-booktarr-text mb-1">
                    Description
                  </label>
                  <textarea
                    value={manualData?.description || ''}
                    onChange={(e) => handleManualFieldChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-booktarr-textMuted border border-booktarr-border rounded-md hover:bg-booktarr-hover bg-booktarr-surface2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveManualChanges}
                    className="px-4 py-2 bg-booktarr-accent text-white rounded-md hover:bg-booktarr-accent/90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;