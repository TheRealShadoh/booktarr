/**
 * Transform v1 data structure to v2 format
 * Maps old schema to new schema
 */

import fs from 'fs';
import path from 'path';

interface V1Book {
  isbn: string;
  title: string;
  authors: string;
  series_name?: string;
  series_position?: number;
  cover_url?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  description?: string;
  categories?: string;
}

interface V2Book {
  title: string;
  subtitle?: string;
  description?: string;
  language: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  metadataSource: string;
}

interface V2Edition {
  isbn13?: string;
  isbn10?: string;
  format: string;
  pages?: number;
  publisher?: string;
  publishedDate?: string;
  coverUrl?: string;
}

interface V2Author {
  name: string;
}

export async function transformData(inputDir: string, outputDir: string) {
  console.log('Starting data transformation...');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read v1 data
  const v1Books: V1Book[] = JSON.parse(
    fs.readFileSync(path.join(inputDir, 'books.json'), 'utf-8')
  );

  const transformedData = {
    books: [] as V2Book[],
    editions: [] as V2Edition[],
    authors: [] as V2Author[],
    bookAuthors: [] as { bookIndex: number; authorName: string; displayOrder: number }[],
    series: [] as { name: string; description?: string }[],
    seriesBooks: [] as { seriesName: string; bookTitle: string; volumeNumber?: number }[],
  };

  const authorSet = new Set<string>();
  const seriesSet = new Set<string>();

  // Transform books
  console.log('Transforming books...');
  v1Books.forEach((v1Book, index) => {
    // Create book
    const v2Book: V2Book = {
      title: v1Book.title,
      description: v1Book.description,
      language: 'en',
      publisher: v1Book.publisher,
      publishedDate: v1Book.published_date,
      pageCount: v1Book.page_count,
      categories: v1Book.categories ? v1Book.categories.split(',').map((c) => c.trim()) : [],
      metadataSource: 'migration_v1',
    };
    transformedData.books.push(v2Book);

    // Create edition
    const isbn13 = v1Book.isbn.length === 13 ? v1Book.isbn : undefined;
    const isbn10 = v1Book.isbn.length === 10 ? v1Book.isbn : undefined;

    const v2Edition: V2Edition = {
      isbn13,
      isbn10,
      format: 'unknown',
      pages: v1Book.page_count,
      publisher: v1Book.publisher,
      publishedDate: v1Book.published_date,
      coverUrl: v1Book.cover_url,
    };
    transformedData.editions.push(v2Edition);

    // Extract authors
    if (v1Book.authors) {
      const authorNames = v1Book.authors.split(',').map((a) => a.trim());
      authorNames.forEach((authorName, authorIndex) => {
        if (!authorSet.has(authorName)) {
          transformedData.authors.push({ name: authorName });
          authorSet.add(authorName);
        }

        transformedData.bookAuthors.push({
          bookIndex: index,
          authorName,
          displayOrder: authorIndex,
        });
      });
    }

    // Extract series
    if (v1Book.series_name) {
      if (!seriesSet.has(v1Book.series_name)) {
        transformedData.series.push({
          name: v1Book.series_name,
        });
        seriesSet.add(v1Book.series_name);
      }

      transformedData.seriesBooks.push({
        seriesName: v1Book.series_name,
        bookTitle: v1Book.title,
        volumeNumber: v1Book.series_position,
      });
    }
  });

  // Write transformed data
  console.log('Writing transformed data...');
  fs.writeFileSync(
    path.join(outputDir, 'transformed.json'),
    JSON.stringify(transformedData, null, 2)
  );

  console.log('Transformation complete!');
  console.log(`- ${transformedData.books.length} books`);
  console.log(`- ${transformedData.editions.length} editions`);
  console.log(`- ${transformedData.authors.length} unique authors`);
  console.log(`- ${transformedData.series.length} series`);

  return transformedData;
}

// CLI usage
if (require.main === module) {
  const inputDir = process.argv[2] || './migration-data';
  const outputDir = process.argv[3] || './migration-data/transformed';

  transformData(inputDir, outputDir)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Transformation failed:', error);
      process.exit(1);
    });
}
