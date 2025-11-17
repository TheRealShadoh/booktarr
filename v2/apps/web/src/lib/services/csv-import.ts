import { BookService } from './books';
import { SeriesService } from './series';

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data?: CSVRow;
  }>;
}

export class CSVImportService {
  private bookService: BookService;
  private seriesService: SeriesService;

  constructor() {
    this.bookService = new BookService();
    this.seriesService = new SeriesService();
  }

  parseCSV(csvContent: string): CSVRow[] {
    // Split into rows while respecting quoted fields that may contain newlines
    const allRows = this.splitCSVRows(csvContent);
    if (allRows.length === 0) return [];

    const headers = this.parseCSVLine(allRows[0]);
    console.log('[CSV Parser] Found', allRows.length, 'rows');
    console.log('[CSV Parser] Headers:', headers.length, 'columns', headers.slice(0, 5));
    const rows: CSVRow[] = [];

    for (let i = 1; i < allRows.length; i++) {
      const values = this.parseCSVLine(allRows[i]);

      // Pad missing columns with empty strings
      while (values.length < headers.length) {
        values.push('');
      }

      // Warn if too many columns (data issue)
      if (values.length > headers.length) {
        console.log(`[CSV Parser] Row ${i} has extra columns: expected ${headers.length}, got ${values.length}`);
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    console.log('[CSV Parser] Parsed', rows.length, 'valid rows');
    return rows;
  }

  private splitCSVRows(csvContent: string): string[] {
    const rows: string[] = [];
    let currentRow = '';
    let inQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
      const char = csvContent[i];
      const nextChar = csvContent[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentRow += '""';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          currentRow += char;
        }
      } else if (char === '\n' && !inQuotes) {
        // End of row (only if not inside quotes)
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else if (char === '\r' && !inQuotes && nextChar === '\n') {
        // Windows line ending - skip \r, will handle \n next
        continue;
      } else if (char === '\r' && !inQuotes) {
        // Mac line ending
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else {
        currentRow += char;
      }
    }

    // Add final row if exists
    if (currentRow.trim()) {
      rows.push(currentRow);
    }

    return rows;
  }

    private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  async importHandyLibCSV(
    csvContent: string,
    userId: string,
    options: {
      skipDuplicates?: boolean;
      enrichMetadata?: boolean;
      onProgress?: (processed: number, success: number, failed: number) => void;
    } = {}
  ): Promise<ImportResult> {
    const { skipDuplicates = true, enrichMetadata = true, onProgress } = options;

    const rows = this.parseCSV(csvContent);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Declare variables outside try block so they're accessible in catch
      let isbn: string | undefined;
      let title: string | undefined;
      let author: string | undefined;

      try {
        // HandyLib CSV format has: Title, Author, Publisher, Published Date, Format, Pages, etc.
        isbn = row.ISBN || row.isbn || row.ISBN13 || row.isbn13;
        title = row.Title || row.title;
        author = row.Author || row.Authors || row.author || row.authors;
        const series = row.Series || row.series;
        const publisher = row.Publisher || row.publisher;
        const publishedDate = row['Published Date'] || row.publishedDate;
        const pages = row.Pages || row.pages;
        const language = row.Language || row.language || 'en';
        const format = row.Format || row.format;
        const summary = row.Summary || row.summary;

        if (!isbn && !title) {
          throw new Error('Missing both ISBN and title');
        }

        // Build authors array from CSV data
        const authors = author ? author.split(/[,;]/).map((a: string) => a.trim()) : [];

        // Add book to collection with CSV data as fallback for failed API enrichment
        await this.bookService.createBook({
          isbn: isbn || undefined,
          title: title || undefined,
          author: author || undefined,
          userId,
          status: 'owned',
          manualEntry: {
            title: title || 'Unknown',
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            publisher,
            publishedDate,
            description: summary,
            pageCount: pages ? parseInt(pages) : undefined,
            language,
          },
          edition: {
            isbn13: isbn?.length === 13 ? isbn : undefined,
            isbn10: isbn?.length === 10 ? isbn : undefined,
            format,
            pages: pages ? parseInt(pages) : undefined,
            publisher,
            publishedDate,
          },
        });

        // If series info is present, create/link to series
        if (series) {
          // Check if series exists
          const existingSeries = await this.seriesService.getSeries(userId, {
            search: series,
            limit: 1,
          });

          let seriesId: string;
          if (existingSeries.length > 0) {
            seriesId = existingSeries[0].id;
          } else {
            // Create new series
            const newSeries = await this.seriesService.createSeries({
              name: series,
              status: 'ongoing',
            });
            seriesId = newSeries.id;
          }

          // Add book to series (would need book ID from createBook response)
          // This is simplified - in production, we'd need to track the book ID
        }

        result.success++;
        console.log(`[CSV Import] Row ${i + 1}: Successfully imported "${title}" (ISBN: ${isbn || 'none'})`);
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CSV Import] Row ${i + 1} FAILED: ${errorMessage}`, {
          isbn,
          title,
          author,
        });
        result.errors.push({
          row: i + 1,
          error: errorMessage,
          data: row,
        });
      }

      // Report progress after each row
      if (onProgress) {
        onProgress(i + 1, result.success, result.failed);
      }
    }

    console.log(`[CSV Import] Complete: ${result.success} successful, ${result.failed} failed`);
    return result;
  }

  async importGenericCSV(
    csvContent: string,
    userId: string,
    fieldMapping: {
      isbn?: string;
      title?: string;
      author?: string;
      series?: string;
      status?: string;
    },
    options: {
      skipDuplicates?: boolean;
      enrichMetadata?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const isbn = fieldMapping.isbn ? row[fieldMapping.isbn] : undefined;
        const title = fieldMapping.title ? row[fieldMapping.title] : undefined;
        const author = fieldMapping.author ? row[fieldMapping.author] : undefined;
        const status = (fieldMapping.status ? row[fieldMapping.status] : 'owned') as
          | 'owned'
          | 'wanted'
          | 'missing';

        if (!isbn && !title) {
          throw new Error('Missing both ISBN and title');
        }

        await this.bookService.createBook({
          isbn: isbn || undefined,
          title: title || undefined,
          author: author || undefined,
          userId,
          status,
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
      }
    }

    return result;
  }
}
