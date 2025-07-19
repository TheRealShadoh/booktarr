/**
 * Share page for exporting and sharing book lists and collections
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book, ReadingStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface SharePageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
}

interface ShareableList {
  id: string;
  name: string;
  description: string;
  books: Book[];
  type: 'reading_status' | 'series' | 'author' | 'category' | 'rating' | 'custom';
  metadata: {
    totalBooks: number;
    totalPages: number;
    averageRating: number;
    createdDate: string;
  };
}

const SharePage: React.FC<SharePageProps> = ({
  books,
  loading,
  error
}) => {
  const { showToast } = useAppContext();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'txt' | 'markdown'>('json');
  const [selectedList, setSelectedList] = useState<string>('');
  const [customListName, setCustomListName] = useState('');
  const [customListDescription, setCustomListDescription] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeProgress, setIncludeProgress] = useState(false);
  const [includeRatings, setIncludeRatings] = useState(true);
  const [shareableLink, setShareableLink] = useState<string>('');

  // Generate predefined shareable lists
  const shareableLists = useMemo((): ShareableList[] => {
    const allBooks = Object.values(books).flat();
    const lists: ShareableList[] = [];

    // By reading status
    Object.values(ReadingStatus).forEach(status => {
      const statusBooks = allBooks.filter(book => book.reading_status === status);
      if (statusBooks.length > 0) {
        lists.push({
          id: `status-${status}`,
          name: `${status.charAt(0).toUpperCase() + status.slice(1)} Books`,
          description: `All books with ${status} status`,
          books: statusBooks,
          type: 'reading_status',
          metadata: {
            totalBooks: statusBooks.length,
            totalPages: statusBooks.reduce((sum, book) => sum + (book.page_count || 0), 0),
            averageRating: statusBooks.filter(book => book.personal_rating && book.personal_rating > 0)
              .reduce((sum, book, _, arr) => sum + (book.personal_rating || 0) / arr.length, 0),
            createdDate: new Date().toISOString()
          }
        });
      }
    });

    // By series
    Object.entries(books).forEach(([seriesName, seriesBooks]) => {
      if (seriesName !== 'Standalone' && seriesBooks.length > 1) {
        lists.push({
          id: `series-${seriesName}`,
          name: seriesName,
          description: `Complete ${seriesName} series`,
          books: seriesBooks,
          type: 'series',
          metadata: {
            totalBooks: seriesBooks.length,
            totalPages: seriesBooks.reduce((sum, book) => sum + (book.page_count || 0), 0),
            averageRating: seriesBooks.filter(book => book.personal_rating && book.personal_rating > 0)
              .reduce((sum, book, _, arr) => sum + (book.personal_rating || 0) / arr.length, 0),
            createdDate: new Date().toISOString()
          }
        });
      }
    });

    // Top rated books
    const topRatedBooks = allBooks
      .filter(book => book.personal_rating && book.personal_rating >= 4.0)
      .sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0));

    if (topRatedBooks.length > 0) {
      lists.push({
        id: 'top-rated',
        name: 'Top Rated Books',
        description: 'Books rated 4+ stars',
        books: topRatedBooks,
        type: 'rating',
        metadata: {
          totalBooks: topRatedBooks.length,
          totalPages: topRatedBooks.reduce((sum, book) => sum + (book.page_count || 0), 0),
          averageRating: topRatedBooks.reduce((sum, book) => sum + (book.personal_rating || 0), 0) / topRatedBooks.length,
          createdDate: new Date().toISOString()
        }
      });
    }

    // Recently read
    const recentlyRead = allBooks
      .filter(book => book.reading_status === ReadingStatus.READ)
      .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
      .slice(0, 20);

    if (recentlyRead.length > 0) {
      lists.push({
        id: 'recently-read',
        name: 'Recently Read',
        description: 'Last 20 books you finished',
        books: recentlyRead,
        type: 'custom',
        metadata: {
          totalBooks: recentlyRead.length,
          totalPages: recentlyRead.reduce((sum, book) => sum + (book.page_count || 0), 0),
          averageRating: recentlyRead.filter(book => book.personal_rating && book.personal_rating > 0)
            .reduce((sum, book, _, arr) => sum + (book.personal_rating || 0) / arr.length, 0),
          createdDate: new Date().toISOString()
        }
      });
    }

    // Currently reading
    const currentlyReading = allBooks.filter(book => book.reading_status === ReadingStatus.READING);
    if (currentlyReading.length > 0) {
      lists.push({
        id: 'currently-reading',
        name: 'Currently Reading',
        description: 'Books in progress',
        books: currentlyReading,
        type: 'reading_status',
        metadata: {
          totalBooks: currentlyReading.length,
          totalPages: currentlyReading.reduce((sum, book) => sum + (book.page_count || 0), 0),
          averageRating: 0,
          createdDate: new Date().toISOString()
        }
      });
    }

    return lists;
  }, [books]);

  const selectedListData = shareableLists.find(list => list.id === selectedList);

  const generateExportData = (list: ShareableList) => {
    const baseData = list.books.map(book => ({
      title: book.title,
      authors: book.authors.join(', '),
      isbn: book.isbn,
      series: book.series || '',
      series_position: book.series_position || '',
      published_date: book.published_date,
      page_count: book.page_count || 0,
      categories: book.categories.join(', '),
      language: book.language,
      ...(includeRatings && { personal_rating: book.personal_rating || 0 }),
      ...(includeProgress && { 
        reading_status: book.reading_status,
        reading_progress_percentage: book.reading_progress_percentage || 0,
        reading_progress_pages: book.reading_progress_pages || 0
      }),
      ...(includeMetadata && {
        added_date: book.added_date,
        last_updated: book.last_updated,
        times_read: book.times_read || 0
      })
    }));

    return baseData;
  };

  const handleExport = () => {
    if (!selectedListData) {
      showToast('Please select a list to export', 'error');
      return;
    }

    const exportData = generateExportData(selectedListData);
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (selectedFormat) {
      case 'csv':
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
          )
        ];
        content = csvRows.join('\n');
        filename = `${selectedListData.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        const jsonData = {
          listInfo: {
            name: selectedListData.name,
            description: selectedListData.description,
            type: selectedListData.type,
            metadata: selectedListData.metadata
          },
          books: exportData,
          exportedBy: 'Booktarr',
          exportedDate: new Date().toISOString()
        };
        content = JSON.stringify(jsonData, null, 2);
        filename = `${selectedListData.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        mimeType = 'application/json';
        break;

      case 'txt':
        const txtLines = [
          `${selectedListData.name}`,
          `${selectedListData.description}`,
          ``,
          `Total Books: ${selectedListData.metadata.totalBooks}`,
          `Total Pages: ${selectedListData.metadata.totalPages}`,
          `Average Rating: ${selectedListData.metadata.averageRating.toFixed(1)}`,
          ``,
          ...exportData.map(book => 
            `${book.title} by ${book.authors}${book.series ? ` (${book.series}${book.series_position ? ` #${book.series_position}` : ''})` : ''}`
          )
        ];
        content = txtLines.join('\n');
        filename = `${selectedListData.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        mimeType = 'text/plain';
        break;

      case 'markdown':
        const mdLines = [
          `# ${selectedListData.name}`,
          ``,
          selectedListData.description,
          ``,
          `## Summary`,
          `- **Total Books:** ${selectedListData.metadata.totalBooks}`,
          `- **Total Pages:** ${selectedListData.metadata.totalPages.toLocaleString()}`,
          `- **Average Rating:** ${selectedListData.metadata.averageRating.toFixed(1)}/5`,
          `- **Exported:** ${new Date().toLocaleDateString()}`,
          ``,
          `## Books`,
          ``,
          ...exportData.map((book, index) => 
            `${index + 1}. **${book.title}** by ${book.authors}${book.series ? ` *(${book.series}${book.series_position ? ` #${book.series_position}` : ''})*` : ''}${includeRatings && book.personal_rating ? ` - ${book.personal_rating}/5 stars` : ''}`
          )
        ];
        content = mdLines.join('\n');
        filename = `${selectedListData.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        mimeType = 'text/markdown';
        break;
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`${selectedListData.name} exported as ${selectedFormat.toUpperCase()}`, 'success');
  };

  const handleGenerateShareableLink = () => {
    if (!selectedListData) {
      showToast('Please select a list to share', 'error');
      return;
    }

    // In a real app, this would send the data to a sharing service
    const shareData = {
      name: selectedListData.name,
      description: selectedListData.description,
      books: selectedListData.books.map(book => ({
        title: book.title,
        authors: book.authors,
        isbn: book.isbn
      })),
      metadata: selectedListData.metadata
    };

    // Simulate generating a shareable link
    const linkId = btoa(JSON.stringify(shareData)).substring(0, 12);
    const mockLink = `https://booktarr.app/shared/${linkId}`;
    setShareableLink(mockLink);

    // Copy to clipboard
    navigator.clipboard.writeText(mockLink).then(() => {
      showToast('Shareable link copied to clipboard', 'success');
    }).catch(() => {
      showToast('Shareable link generated', 'success');
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading your library..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h1 className="text-booktarr-text text-2xl font-bold mb-2">Share & Export</h1>
          <p className="text-booktarr-textSecondary text-sm">
            Export your book lists and create shareable links for friends and social media
          </p>
        </div>
      </div>

      {/* List Selection */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Select List to Share</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shareableLists.map(list => (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedList === list.id
                    ? 'border-booktarr-accent bg-booktarr-accent bg-opacity-10'
                    : 'border-booktarr-border hover:border-booktarr-hover'
                }`}
              >
                <h3 className="font-medium text-booktarr-text mb-1">{list.name}</h3>
                <p className="text-sm text-booktarr-textSecondary mb-2">{list.description}</p>
                <div className="flex items-center justify-between text-xs text-booktarr-textMuted">
                  <span>{list.metadata.totalBooks} books</span>
                  <span className="capitalize bg-booktarr-surface2 px-2 py-1 rounded">{list.type.replace('_', ' ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      {selectedListData && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Export Options</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Customize what information to include in your export
            </p>
          </div>
          <div className="booktarr-card-body space-y-6">
            {/* Format Selection */}
            <div>
              <label className="booktarr-form-label">Export Format</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'json', name: 'JSON', desc: 'Machine readable' },
                  { id: 'csv', name: 'CSV', desc: 'Excel compatible' },
                  { id: 'txt', name: 'Text', desc: 'Simple list' },
                  { id: 'markdown', name: 'Markdown', desc: 'Formatted text' }
                ].map(format => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as any)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      selectedFormat === format.id
                        ? 'border-booktarr-accent bg-booktarr-accent bg-opacity-10 text-booktarr-accent'
                        : 'border-booktarr-border text-booktarr-text hover:border-booktarr-hover'
                    }`}
                  >
                    <div className="font-medium">{format.name}</div>
                    <div className="text-xs text-booktarr-textMuted">{format.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Include Options */}
            <div>
              <label className="booktarr-form-label">Include Options</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded border-booktarr-border"
                  />
                  <span className="text-sm text-booktarr-text">Include metadata (dates, times read)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeRatings}
                    onChange={(e) => setIncludeRatings(e.target.checked)}
                    className="rounded border-booktarr-border"
                  />
                  <span className="text-sm text-booktarr-text">Include personal ratings</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeProgress}
                    onChange={(e) => setIncludeProgress(e.target.checked)}
                    className="rounded border-booktarr-border"
                  />
                  <span className="text-sm text-booktarr-text">Include reading progress</span>
                </label>
              </div>
            </div>

            {/* List Preview */}
            <div>
              <label className="booktarr-form-label">Preview</label>
              <div className="bg-booktarr-surface2 rounded-lg p-4">
                <h3 className="font-medium text-booktarr-text mb-1">{selectedListData.name}</h3>
                <p className="text-sm text-booktarr-textSecondary mb-3">{selectedListData.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-booktarr-textMuted">Books</div>
                    <div className="font-medium text-booktarr-text">{selectedListData.metadata.totalBooks}</div>
                  </div>
                  <div>
                    <div className="text-booktarr-textMuted">Pages</div>
                    <div className="font-medium text-booktarr-text">{selectedListData.metadata.totalPages.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-booktarr-textMuted">Avg Rating</div>
                    <div className="font-medium text-booktarr-text">{selectedListData.metadata.averageRating.toFixed(1)}/5</div>
                  </div>
                  <div>
                    <div className="text-booktarr-textMuted">Type</div>
                    <div className="font-medium text-booktarr-text capitalize">{selectedListData.type.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="booktarr-btn booktarr-btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export {selectedFormat.toUpperCase()}
              </button>
              <button
                onClick={handleGenerateShareableLink}
                className="booktarr-btn booktarr-btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Generate Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Link */}
      {shareableLink && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Shareable Link</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Share this link with friends or post on social media
            </p>
          </div>
          <div className="booktarr-card-body">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="booktarr-form-input flex-1 bg-booktarr-surface2"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareableLink)}
                className="booktarr-btn booktarr-btn-secondary"
              >
                Copy
              </button>
            </div>
            <div className="mt-3 text-sm text-booktarr-textMuted">
              This link allows others to view your book list (without personal ratings or progress).
            </div>
          </div>
        </div>
      )}

      {/* Social Sharing */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Social Sharing</h2>
        </div>
        <div className="booktarr-card-body">
          <p className="text-booktarr-textSecondary text-sm mb-4">
            Quick share options for popular platforms
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Twitter', color: 'bg-blue-500', icon: '#' },
              { name: 'Facebook', color: 'bg-blue-600', icon: 'f' },
              { name: 'Reddit', color: 'bg-orange-500', icon: 'r' },
              { name: 'Goodreads', color: 'bg-amber-600', icon: 'g' }
            ].map(platform => (
              <button
                key={platform.name}
                className={`${platform.color} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}
                disabled={!selectedListData}
              >
                <span className="font-bold mr-2">{platform.icon}</span>
                Share on {platform.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;