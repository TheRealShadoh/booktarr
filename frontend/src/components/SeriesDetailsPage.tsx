/**
 * SeriesDetailsPage - Comprehensive series view with metadata and volumes
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Book, SeriesDetailsResponse, SeriesVolume, SeriesInfo } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface SeriesDetailsPageProps {
  seriesName: string;
  ownedBooks: Book[];
  onBack: () => void;
  onBookClick?: (book: Book) => void;
}

const SeriesDetailsPage: React.FC<SeriesDetailsPageProps> = ({ 
  seriesName, 
  ownedBooks, 
  onBack, 
  onBookClick 
}) => {
  const [seriesData, setSeriesData] = useState<SeriesDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'title' | 'published_date'>('position');
  const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'missing' | 'wanted'>('all');
  const [selectedTab, setSelectedTab] = useState<'volumes' | 'overview'>('overview');

  // Fetch comprehensive series data from the backend
  useEffect(() => {
    const fetchSeriesData = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Check if we got an error response (series creation failed)
          if ('error' in data && data.error) {
            throw new Error(data.error as string);
          }
          
          setSeriesData(data as SeriesDetailsResponse);
          setLoading(false);  // Set loading to false after successful data fetch
        } else {
          throw new Error(`Failed to fetch series data: ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching series data:', err);
        
        // If this is the first attempt and we got an error, it might mean 
        // the series is being created - wait a moment and retry once
        if (retryCount === 0) {
          setTimeout(() => {
            fetchSeriesData(1);
          }, 2000);
          return;
        }
        
        setError(`Failed to load series information: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    fetchSeriesData();
  }, [seriesName]);

  // Refresh series metadata
  const refreshSeriesMetadata = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}/refresh`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        // Refetch series data to show updated information
        const updatedResponse = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
        if (updatedResponse.ok) {
          const data: SeriesDetailsResponse = await updatedResponse.json();
          setSeriesData(data);
        }
        
        alert(`Series metadata refreshed successfully! Updated ${result.updated_volumes || 0} volumes.`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Error refreshing series metadata:', err);
      alert('Failed to refresh series metadata. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update volume status
  const updateVolumeStatus = async (position: number, status: 'owned' | 'wanted' | 'missing') => {
    try {
      const response = await fetch(
        `/api/series/${encodeURIComponent(seriesName)}/volumes/${position}/status?status=${status}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        // Refresh series data
        const updatedResponse = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
        if (updatedResponse.ok) {
          const data: SeriesDetailsResponse = await updatedResponse.json();
          setSeriesData(data);
        }
      } else {
        console.error('Failed to update volume status');
      }
    } catch (err) {
      console.error('Error updating volume status:', err);
    }
  };

  // Filter and sort volumes
  const filteredVolumes = useMemo(() => {
    if (!seriesData || !seriesData.volumes) return [];
    
    let filtered = seriesData.volumes;
    
    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(volume => volume.status === filterBy);
    }
    
    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'position':
          return a.position - b.position;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'published_date':
          if (!a.published_date && !b.published_date) return 0;
          if (!a.published_date) return 1;
          if (!b.published_date) return -1;
          return new Date(a.published_date).getTime() - new Date(b.published_date).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [seriesData, sortBy, filterBy]);

  const handleVolumeClick = (volume: SeriesVolume) => {
    if (volume.owned_book && onBookClick) {
      // Convert SeriesVolume owned_book to Book format
      const book: Book = {
        isbn: volume.owned_book.isbn || '',
        title: volume.owned_book.title,
        authors: volume.owned_book.authors,
        series: seriesName,
        series_position: volume.position,
        publisher: volume.publisher || '',
        published_date: volume.published_date || '',
        page_count: volume.page_count || 0,
        language: 'en',
        thumbnail_url: volume.cover_url || '',
        cover_url: volume.cover_url || '',
        description: volume.description || '',
        categories: [],
        pricing: [],
        metadata_source: 'google_books' as any,
        added_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        isbn10: volume.isbn_10,
        isbn13: volume.isbn_13,
        metadata_enhanced: false,
        reading_status: 'unread' as any,
        times_read: 0
      };
      onBookClick(book);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-booktarr-bg">
        <LoadingSpinner />
        <p className="mt-4 text-booktarr-textMuted">
          Loading series information for "{seriesName}"...
        </p>
        <p className="mt-2 text-sm text-booktarr-textMuted">
          If this series is new, we're fetching complete metadata from external sources.
        </p>
      </div>
    );
  }

  if (error || !seriesData) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-booktarr-bg min-h-screen">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Series data not available'}</p>
          <button 
            onClick={onBack}
            className="booktarr-btn booktarr-btn-primary"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const { series, volumes, stats } = seriesData;
  
  // Provide fallbacks for all objects to prevent undefined errors
  const safeSeries = {
    name: series?.name || 'Unknown Series',
    author: series?.author || 'Unknown Author',
    description: series?.description || null,
    publisher: series?.publisher || null,
    total_books: series?.total_books || 0,
    status: series?.status || 'unknown',
    first_published: series?.first_published || null,
    last_published: series?.last_published || null,
    genres: series?.genres || [],
    tags: series?.tags || []
  };
  
  const safeStats = {
    total_volumes: stats?.total_volumes || 0,
    owned_volumes: stats?.owned_volumes || 0,
    missing_volumes: stats?.missing_volumes || 0,
    wanted_volumes: stats?.wanted_volumes || 0,
    completion_percentage: stats?.completion_percentage || 0
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-booktarr-bg min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to Library</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-booktarr-text">{safeSeries.name}</h1>
            <p className="text-booktarr-textMuted">
              {safeSeries.author || 'Unknown Author'}
            </p>
          </div>
        </div>
        
        {/* Quick stats and refresh button */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-booktarr-accent">{safeStats.owned_volumes}</div>
            <div className="text-xs text-booktarr-textMuted">Owned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{safeStats.missing_volumes}</div>
            <div className="text-xs text-booktarr-textMuted">Missing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{safeStats.wanted_volumes}</div>
            <div className="text-xs text-booktarr-textMuted">Wanted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{safeStats.completion_percentage}%</div>
            <div className="text-xs text-booktarr-textMuted">Complete</div>
          </div>
          <button
            onClick={refreshSeriesMetadata}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors"
            title="Refresh series metadata from external sources"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-booktarr-textMuted mb-2">
          <span>Series Progress</span>
          <span>{safeStats.owned_volumes} of {safeStats.total_volumes} volumes</span>
        </div>
        <div className="w-full bg-booktarr-border rounded-full h-3">
          <div 
            className="bg-booktarr-accent h-3 rounded-full transition-all duration-300"
            style={{ width: `${safeStats.completion_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-booktarr-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-booktarr-accent text-booktarr-accent'
                  : 'border-transparent text-booktarr-textMuted hover:text-booktarr-text hover:border-booktarr-textMuted'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('volumes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'volumes'
                  ? 'border-booktarr-accent text-booktarr-accent'
                  : 'border-transparent text-booktarr-textMuted hover:text-booktarr-text hover:border-booktarr-textMuted'
              }`}
            >
              Volumes ({safeStats.total_volumes})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Series Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Series Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-booktarr-textMuted text-sm">Author:</span>
                  <p className="text-booktarr-text">{safeSeries.author || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted text-sm">Publisher:</span>
                  <p className="text-booktarr-text">{safeSeries.publisher || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted text-sm">Status:</span>
                  <p className="text-booktarr-text capitalize">{safeSeries.status || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted text-sm">Publication Period:</span>
                  <p className="text-booktarr-text">
                    {safeSeries.first_published ? new Date(safeSeries.first_published).getFullYear() : '?'} - {safeSeries.last_published ? new Date(safeSeries.last_published).getFullYear() : 'Ongoing'}
                  </p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted text-sm">Total Books:</span>
                  <p className="text-booktarr-text">{safeSeries.total_books || safeStats.total_volumes}</p>
                </div>
              </div>
            </div>

            {/* Progress Statistics */}
            <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Collection Progress</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-booktarr-textMuted">Owned</span>
                  <span className="text-green-600 font-medium">{safeStats.owned_volumes}/{safeStats.total_volumes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-booktarr-textMuted">Missing</span>
                  <span className="text-red-600 font-medium">{safeStats.missing_volumes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-booktarr-textMuted">Wanted</span>
                  <span className="text-blue-600 font-medium">{safeStats.wanted_volumes}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-booktarr-border">
                  <span className="text-booktarr-text font-medium">Completion</span>
                  <span className="text-booktarr-accent font-bold">{safeStats.completion_percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {safeSeries.description && (
            <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Description</h3>
              <p className="text-booktarr-textSecondary leading-relaxed">{safeSeries.description}</p>
            </div>
          )}

          {/* Genres and Tags */}
          {(safeSeries.genres?.length > 0 || safeSeries.tags?.length > 0) && (
            <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Genres & Tags</h3>
              <div className="space-y-3">
                {safeSeries.genres?.length > 0 && (
                  <div>
                    <span className="text-booktarr-textMuted text-sm mb-2 block">Genres:</span>
                    <div className="flex flex-wrap gap-2">
                      {safeSeries.genres.map((genre, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-booktarr-accent text-white text-sm rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {safeSeries.tags?.length > 0 && (
                  <div>
                    <span className="text-booktarr-textMuted text-sm mb-2 block">Tags:</span>
                    <div className="flex flex-wrap gap-2">
                      {safeSeries.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-booktarr-surface2 text-booktarr-text text-sm rounded-full border border-booktarr-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'volumes' && (
        <div>
          {/* Controls */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-1">Sort by</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                >
                  <option value="position">Volume Number</option>
                  <option value="title">Title</option>
                  <option value="published_date">Publication Date</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-1">Filter</label>
                <select 
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                >
                  <option value="all">All Volumes</option>
                  <option value="owned">Owned</option>
                  <option value="missing">Missing</option>
                  <option value="wanted">Wanted</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-booktarr-textMuted">
              Showing {filteredVolumes.length} of {safeStats.total_volumes} volumes
            </div>
          </div>

          {/* Volumes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredVolumes.map((volume) => (
              <div 
                key={`${volume.position}-${volume.title}`}
                className={`group relative rounded-lg border transition-all duration-200 ${
                  volume.status === 'owned' 
                    ? 'border-green-200 bg-white hover:shadow-lg cursor-pointer' 
                    : volume.status === 'wanted'
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    : 'border-red-200 bg-red-50 hover:bg-red-100'
                }`}
                onClick={() => volume.status === 'owned' && handleVolumeClick(volume)}
              >
                {/* Volume Cover */}
                <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                  {volume.cover_url ? (
                    <img 
                      src={volume.cover_url} 
                      alt={volume.title}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      volume.status === 'owned' ? 'bg-gray-200' : 
                      volume.status === 'wanted' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <div className="text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <div className="text-xs">#{volume.position}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status overlay */}
                  <div className="absolute top-2 left-2">
                    {volume.status === 'owned' && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        ✓ Owned
                      </span>
                    )}
                    {volume.status === 'missing' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        ❌ Missing
                      </span>
                    )}
                    {volume.status === 'wanted' && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        ⭐ Wanted
                      </span>
                    )}
                  </div>
                  
                  {/* Volume number */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                    #{volume.position}
                  </div>
                </div>
                
                {/* Volume Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-booktarr-text mb-1 line-clamp-2" title={volume.title}>
                    {volume.title}
                  </h3>
                  
                  <div className="text-xs text-booktarr-textMuted space-y-1">
                    {volume.published_date && (
                      <div>📅 {new Date(volume.published_date).getFullYear()}</div>
                    )}
                    {volume.publisher && (
                      <div>🏢 {volume.publisher}</div>
                    )}
                    {volume.isbn_13 && (
                      <div>📖 {volume.isbn_13}</div>
                    )}
                    {volume.page_count && (
                      <div>📄 {volume.page_count} pages</div>
                    )}
                  </div>
                  
                  {/* Action buttons for missing/wanted volumes */}
                  {volume.status !== 'owned' && (
                    <div className="mt-2 flex space-x-1">
                      {volume.status === 'missing' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateVolumeStatus(volume.position, 'wanted');
                          }}
                          className="flex-1 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600 transition-colors"
                        >
                          Want
                        </button>
                      )}
                      {volume.status === 'wanted' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateVolumeStatus(volume.position, 'missing');
                          }}
                          className="flex-1 bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredVolumes.length === 0 && (
            <div className="text-center py-12 text-booktarr-textMuted">
              <span className="text-4xl block mb-4">📚</span>
              <p>No volumes found matching the current filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeriesDetailsPage;