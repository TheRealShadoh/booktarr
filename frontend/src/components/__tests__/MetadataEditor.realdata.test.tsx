/**
 * Enhanced MetadataEditor component tests using real data patterns from HandyLib.csv
 * Tests metadata search, editing, and application with actual book data
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MetadataEditor } from '../MetadataEditor';

// Mock real book data from HandyLib.csv
const realBookData = {
  id: 1,
  isbn: '9781975363178',
  title: '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
  authors: ['Akasaka, Aka', 'Yokoyari, Mengo', 'Blackman, Abigail'],
  series: '推しの子 [Oshi no Ko]',
  series_position: 1,
  publisher: 'Yen Press',
  published_date: '2023-01-17',
  page_count: 228,
  language: 'English',
  cover_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
  description: 'In show business, lies are a weapon. Gorou is an ob-gyn with a life far removed from the glitz and glamour...',
  categories: ['Fantasy']
};

// Mock volume data for series editing
const realVolumeData = {
  position: 1,
  series_name: '推しの子 [Oshi no Ko]',
  title: '[Oshi No Ko], Vol. 1',
  isbn_13: '9781975363178',
  publisher: 'Yen Press',
  release_date: '2023-01-17',
  page_count: 228,
  cover_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg'
};

// Mock search results with real-looking data
const mockSearchResults = [
  {
    title: '[Oshi No Ko], Vol. 1',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    isbn_13: '9781975363178',
    publisher: 'Yen Press',
    release_date: '2023-01-17',
    page_count: 228,
    description: 'Complete description from Google Books...',
    cover_url: 'https://books.google.com/books/content?id=xyz&printsec=frontcover&img=1&zoom=1',
    source: 'Google Books',
    series_name: '推しの子 [Oshi no Ko]',
    series_position: 1
  },
  {
    title: '[Oshi No Ko], Vol. 1',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    isbn_13: '9781975363178',
    publisher: 'Yen Press',
    release_date: '2023-01-17',
    page_count: 228,
    description: 'Description from OpenLibrary...',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781975363178-L.jpg',
    source: 'OpenLibrary'
  },
  {
    title: '[Oshi No Ko], Vol. 1',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    isbn_13: '9781975363178',
    publisher: 'Yen Press',
    release_date: '2023-01-17',
    page_count: 228,
    description: 'Description from Amazon...',
    cover_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
    source: 'Amazon'
  }
];

// Mock fetch for API calls
global.fetch = jest.fn();

const mockProps = {
  type: 'book' as const,
  itemId: 1,
  currentData: realBookData,
  onClose: jest.fn(),
  onUpdate: jest.fn()
};

describe('MetadataEditor with Real Data Patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Initial rendering with real book data', () => {
    it('displays current Oshi no Ko book data correctly', () => {
      render(<MetadataEditor {...mockProps} />);
      
      // Check that current data is displayed
      expect(screen.getByDisplayValue('[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Akasaka, Aka; Yokoyari, Mengo; Blackman, Abigail')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9781975363178')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Yen Press')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2023-01-17')).toBeInTheDocument();
      expect(screen.getByDisplayValue('228')).toBeInTheDocument();
    });

    it('pre-populates search query with current title', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText(/Search by/);
      expect(searchInput).toHaveValue('[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)');
    });

    it('displays Japanese series name correctly', () => {
      render(<MetadataEditor {...mockProps} />);
      
      expect(screen.getByDisplayValue('推しの子 [Oshi no Ko]')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });
  });

  describe('Metadata search functionality', () => {
    it('searches by title with real manga title', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });

      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/search-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
            search_type: 'title'
          })
        });
      });
    });

    it('searches by ISBN with real ISBN-13', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });

      render(<MetadataEditor {...mockProps} />);
      
      // Switch to ISBN search
      const searchTypeSelect = screen.getByDisplayValue('title');
      fireEvent.change(searchTypeSelect, { target: { value: 'isbn' } });
      
      // Update search query to ISBN
      const searchInput = screen.getByPlaceholderText(/Search by/);
      fireEvent.change(searchInput, { target: { value: '9781975363178' } });
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/search-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '9781975363178',
            search_type: 'isbn'
          })
        });
      });
    });

    it('searches by author with Japanese authors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });

      render(<MetadataEditor {...mockProps} />);
      
      // Switch to author search
      const searchTypeSelect = screen.getByDisplayValue('title');
      fireEvent.change(searchTypeSelect, { target: { value: 'author' } });
      
      // Update search query to author
      const searchInput = screen.getByPlaceholderText(/Search by/);
      fireEvent.change(searchInput, { target: { value: 'Akasaka, Aka' } });
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/search-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Akasaka, Aka',
            search_type: 'author'
          })
        });
      });
    });
  });

  describe('Search results display and interaction', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });
    });

    it('should render and handle search correctly', async () => {
      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('3 results found')).toBeInTheDocument();
      });
    });

    it('displays search results from multiple sources', () => {
      // Check that all three sources are displayed
      expect(screen.getByText('Google Books')).toBeInTheDocument();
      expect(screen.getByText('OpenLibrary')).toBeInTheDocument();
      expect(screen.getByText('Amazon')).toBeInTheDocument();
    });

    it('shows different cover URLs from different sources', () => {
      const images = screen.getAllByRole('img');
      
      // Should have multiple cover images from different sources
      expect(images.length).toBeGreaterThan(1);
      
      // Check for different image sources
      expect(images.some(img => img.getAttribute('src')?.includes('books.google.com'))).toBe(true);
      expect(images.some(img => img.getAttribute('src')?.includes('covers.openlibrary.org'))).toBe(true);
      expect(images.some(img => img.getAttribute('src')?.includes('media-amazon.com'))).toBe(true);
    });

    it('applies selected metadata to current data', async () => {
      // Click on the Google Books result
      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]); // Google Books result
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/search-metadata', expect.any(Object));
      });
      
      // Check that form fields are updated with Google Books data
      expect(screen.getByDisplayValue('Complete description from Google Books...')).toBeInTheDocument();
    });

    it('shows source-specific information', () => {
      // Each result should show its source
      expect(screen.getByText('Source: Google Books')).toBeInTheDocument();
      expect(screen.getByText('Source: OpenLibrary')).toBeInTheDocument();
      expect(screen.getByText('Source: Amazon')).toBeInTheDocument();
    });
  });

  describe('Manual editing with real data patterns', () => {
    it('allows manual editing of Japanese series names', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const manualEditButton = screen.getByText('Manual Edit');
      fireEvent.click(manualEditButton);
      
      const seriesInput = screen.getByDisplayValue('推しの子 [Oshi no Ko]');
      fireEvent.change(seriesInput, { target: { value: '推しの子 [Oshi no Ko] - Updated' } });
      
      expect(screen.getByDisplayValue('推しの子 [Oshi no Ko] - Updated')).toBeInTheDocument();
    });

    it('handles multiple authors correctly', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const manualEditButton = screen.getByText('Manual Edit');
      fireEvent.click(manualEditButton);
      
      const authorsInput = screen.getByDisplayValue('Akasaka, Aka; Yokoyari, Mengo; Blackman, Abigail');
      fireEvent.change(authorsInput, { target: { value: 'Akasaka, Aka; Yokoyari, Mengo' } });
      
      expect(screen.getByDisplayValue('Akasaka, Aka; Yokoyari, Mengo')).toBeInTheDocument();
    });

    it('validates ISBN format during editing', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const manualEditButton = screen.getByText('Manual Edit');
      fireEvent.click(manualEditButton);
      
      const isbnInput = screen.getByDisplayValue('9781975363178');
      fireEvent.change(isbnInput, { target: { value: 'invalid-isbn' } });
      
      // Should show validation error
      expect(screen.getByText(/Invalid ISBN format/)).toBeInTheDocument();
    });

    it('validates date format for Japanese publication dates', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const manualEditButton = screen.getByText('Manual Edit');
      fireEvent.click(manualEditButton);
      
      const dateInput = screen.getByDisplayValue('2023-01-17');
      fireEvent.change(dateInput, { target: { value: 'invalid-date' } });
      
      // Should show validation error
      expect(screen.getByText(/Invalid date format/)).toBeInTheDocument();
    });
  });

  describe('Volume-specific editing', () => {
    const volumeProps = {
      type: 'volume' as const,
      itemId: 1,
      seriesName: '推しの子 [Oshi no Ko]',
      position: 1,
      currentData: realVolumeData,
      onClose: jest.fn(),
      onUpdate: jest.fn()
    };

    it('displays volume-specific metadata editor', () => {
      render(<MetadataEditor {...volumeProps} />);
      
      expect(screen.getByText('Edit Volume Metadata')).toBeInTheDocument();
      expect(screen.getByDisplayValue('推しの子 [Oshi no Ko]')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('searches for volume-specific metadata', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });

      render(<MetadataEditor {...volumeProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/search-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '[Oshi No Ko], Vol. 1',
            search_type: 'title',
            series_name: '推しの子 [Oshi no Ko]',
            volume_position: 1
          })
        });
      });
    });

    it('applies volume metadata correctly', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockSearchResults })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      render(<MetadataEditor {...volumeProps} />);
      
      // Search first
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('3 results found')).toBeInTheDocument();
      });
      
      // Apply first result
      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/series/推しの子 [Oshi no Ko]/volumes/1/apply-metadata`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockSearchResults[0])
          }
        );
      });
    });
  });

  describe('Error handling', () => {
    it('handles search API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('handles empty search results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });

    it('shows loading state during search', async () => {
      // Mock a delayed response
      (fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ results: mockSearchResults })
        }), 100))
      );

      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      // Should show loading state
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('3 results found')).toBeInTheDocument();
      });
    });
  });

  describe('Save functionality', () => {
    it('saves manual edits correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<MetadataEditor {...mockProps} />);
      
      const manualEditButton = screen.getByText('Manual Edit');
      fireEvent.click(manualEditButton);
      
      // Make some changes
      const titleInput = screen.getByDisplayValue('[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)');
      fireEvent.change(titleInput, { target: { value: '[Oshi No Ko], Vol. 1 - Updated' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockProps.onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '[Oshi No Ko], Vol. 1 - Updated'
          })
        );
      });
    });

    it('calls onClose when cancel is clicked', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Cover image handling', () => {
    it('displays current cover image', () => {
      render(<MetadataEditor {...mockProps} />);
      
      const currentImage = screen.getByAltText('Current cover');
      expect(currentImage).toHaveAttribute('src', realBookData.cover_url);
    });

    it('updates cover image when metadata is applied', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockSearchResults })
      });

      render(<MetadataEditor {...mockProps} />);
      
      const searchButton = screen.getByText('Search Metadata');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('3 results found')).toBeInTheDocument();
      });
      
      // Apply Google Books result with different cover
      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]);
      
      await waitFor(() => {
        const updatedImage = screen.getByDisplayValue('https://books.google.com/books/content?id=xyz&printsec=frontcover&img=1&zoom=1');
        expect(updatedImage).toBeInTheDocument();
      });
    });
  });
});