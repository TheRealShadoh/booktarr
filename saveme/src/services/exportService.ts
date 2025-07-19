/**
 * Export service for various data formats
 * Supports CSV, JSON, and other export formats
 */
import { Book, Settings } from '../types';

export class ExportService {
  /**
   * Export books to CSV format
   */
  static exportToCSV(books: Book[], filename?: string): void {
    const headers = [
      'ISBN',
      'Title',
      'Authors',
      'Series',
      'Series Position',
      'Publisher',
      'Published Date',
      'Page Count',
      'Language',
      'Categories',
      'Added Date',
      'Last Updated',
      'Metadata Source'
    ];

    const csvData = [
      headers.join(','),
      ...books.map(book => [
        `"${book.isbn}"`,
        `"${book.title.replace(/"/g, '""')}"`,
        `"${book.authors.join('; ').replace(/"/g, '""')}"`,
        `"${book.series || ''}"`,
        book.series_position || '',
        `"${book.publisher || ''}"`,
        book.published_date || '',
        book.page_count || '',
        `"${book.language}"`,
        `"${book.categories.join('; ').replace(/"/g, '""')}"`,
        book.added_date,
        book.last_updated,
        `"${book.metadata_source}"`
      ].join(','))
    ];

    this.downloadFile(
      csvData.join('\n'),
      filename || `booktarr-library-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  }

  /**
   * Export books to JSON format
   */
  static exportToJSON(books: Book[], filename?: string): void {
    const data = {
      exported: new Date().toISOString(),
      version: '1.0.0',
      totalBooks: books.length,
      books: books
    };

    this.downloadFile(
      JSON.stringify(data, null, 2),
      filename || `booktarr-library-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  }

  /**
   * Export complete backup including settings
   */
  static exportCompleteBackup(books: Book[], settings: Settings, filename?: string): void {
    const data = {
      exported: new Date().toISOString(),
      version: '1.0.0',
      backup_type: 'complete',
      library: {
        totalBooks: books.length,
        books: books
      },
      settings: settings
    };

    this.downloadFile(
      JSON.stringify(data, null, 2),
      filename || `booktarr-backup-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  }

  /**
   * Export reading list (books without series or specific series)
   */
  static exportReadingList(books: Book[], series?: string, filename?: string): void {
    const filteredBooks = series 
      ? books.filter(book => book.series === series)
      : books.filter(book => !book.series);

    const headers = ['Title', 'Authors', 'Pages', 'Published'];
    const csvData = [
      headers.join(','),
      ...filteredBooks.map(book => [
        `"${book.title.replace(/"/g, '""')}"`,
        `"${book.authors.join(', ').replace(/"/g, '""')}"`,
        book.page_count || 'Unknown',
        book.published_date ? new Date(book.published_date).getFullYear() : 'Unknown'
      ].join(','))
    ];

    this.downloadFile(
      csvData.join('\n'),
      filename || `reading-list-${series || 'standalone'}-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  }

  /**
   * Export library statistics
   */
  static exportStatistics(books: Book[], filename?: string): void {
    const seriesMap = new Map<string, Book[]>();
    const authorMap = new Map<string, Book[]>();
    const categoryMap = new Map<string, number>();
    const yearMap = new Map<number, number>();

    // Group by series
    books.forEach(book => {
      const series = book.series || 'Standalone';
      if (!seriesMap.has(series)) {
        seriesMap.set(series, []);
      }
      seriesMap.get(series)!.push(book);

      // Group by authors
      book.authors.forEach(author => {
        if (!authorMap.has(author)) {
          authorMap.set(author, []);
        }
        authorMap.get(author)!.push(book);
      });

      // Count categories
      book.categories.forEach(category => {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      // Count by year added
      if (book.added_date) {
        const year = new Date(book.added_date).getFullYear();
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    });

    const statistics = {
      generated: new Date().toISOString(),
      overview: {
        totalBooks: books.length,
        totalSeries: seriesMap.size,
        totalAuthors: authorMap.size,
        totalPages: books.reduce((sum, book) => sum + (book.page_count || 0), 0),
        averagePages: books.reduce((sum, book) => sum + (book.page_count || 0), 0) / books.length
      },
      series: Array.from(seriesMap.entries()).map(([name, books]) => ({
        name,
        bookCount: books.length,
        totalPages: books.reduce((sum, book) => sum + (book.page_count || 0), 0)
      })).sort((a, b) => b.bookCount - a.bookCount),
      authors: Array.from(authorMap.entries()).map(([name, books]) => ({
        name,
        bookCount: books.length,
        totalPages: books.reduce((sum, book) => sum + (book.page_count || 0), 0)
      })).sort((a, b) => b.bookCount - a.bookCount),
      categories: Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count),
      yearlyAdditions: Array.from(yearMap.entries()).map(([year, count]) => ({
        year,
        count
      })).sort((a, b) => a.year - b.year)
    };

    this.downloadFile(
      JSON.stringify(statistics, null, 2),
      filename || `booktarr-statistics-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  }

  /**
   * Export custom format based on user preferences
   */
  static exportCustomFormat(
    books: Book[], 
    fields: string[], 
    format: 'csv' | 'json' | 'txt',
    filename?: string
  ): void {
    if (format === 'json') {
      const customData = books.map(book => {
        const customBook: any = {};
        fields.forEach(field => {
          if (field in book) {
            customBook[field] = (book as any)[field];
          }
        });
        return customBook;
      });

      this.downloadFile(
        JSON.stringify(customData, null, 2),
        filename || `booktarr-custom-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
    } else if (format === 'csv') {
      const csvData = [
        fields.join(','),
        ...books.map(book => 
          fields.map(field => {
            const value = (book as any)[field];
            if (Array.isArray(value)) {
              return `"${value.join('; ').replace(/"/g, '""')}"`;
            }
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : (value || '');
          }).join(',')
        )
      ];

      this.downloadFile(
        csvData.join('\n'),
        filename || `booktarr-custom-${new Date().toISOString().split('T')[0]}.csv`,
        'text/csv'
      );
    } else if (format === 'txt') {
      const txtData = books.map(book => {
        return fields.map(field => {
          const value = (book as any)[field];
          if (Array.isArray(value)) {
            return `${field}: ${value.join(', ')}`;
          }
          return `${field}: ${value || 'N/A'}`;
        }).join('\n');
      }).join('\n\n---\n\n');

      this.downloadFile(
        txtData,
        filename || `booktarr-custom-${new Date().toISOString().split('T')[0]}.txt`,
        'text/plain'
      );
    }
  }

  /**
   * Import books from JSON file
   */
  static importFromJSON(file: File): Promise<Book[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          // Handle different import formats
          let books: Book[];
          
          if (data.books && Array.isArray(data.books)) {
            books = data.books;
          } else if (data.library && data.library.books) {
            books = data.library.books;
          } else if (Array.isArray(data)) {
            books = data;
          } else {
            throw new Error('Invalid file format');
          }
          
          // Validate book structure
          const validBooks = books.filter(book => 
            book.isbn && book.title && book.authors && Array.isArray(book.authors)
          );
          
          resolve(validBooks);
        } catch (error) {
          reject(new Error('Failed to parse JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Import books from CSV file
   */
  static importFromCSV(file: File): Promise<Partial<Book>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file must have headers and at least one data row');
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const books: Partial<Book>[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const book: Partial<Book> = {};
            
            headers.forEach((header, index) => {
              const value = values[index]?.trim().replace(/"/g, '');
              
              switch (header.toLowerCase()) {
                case 'isbn':
                  book.isbn = value;
                  break;
                case 'title':
                  book.title = value;
                  break;
                case 'authors':
                  book.authors = value ? value.split(';').map(a => a.trim()) : [];
                  break;
                case 'series':
                  book.series = value || undefined;
                  break;
                case 'series position':
                  book.series_position = value ? parseInt(value) : undefined;
                  break;
                case 'publisher':
                  book.publisher = value || undefined;
                  break;
                case 'page count':
                  book.page_count = value ? parseInt(value) : undefined;
                  break;
                case 'language':
                  book.language = value || 'en';
                  break;
                case 'categories':
                  book.categories = value ? value.split(';').map(c => c.trim()) : [];
                  break;
              }
            });
            
            if (book.isbn && book.title) {
              books.push(book);
            }
          }
          
          resolve(books);
        } catch (error) {
          reject(new Error('Failed to parse CSV file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Download file helper
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}