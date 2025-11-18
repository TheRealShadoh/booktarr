/**
 * Import transformed data into BookTarr v2 (PostgreSQL)
 * Uses Drizzle ORM to insert data
 */

import fs from 'fs';
import path from 'path';
import { db } from '../../packages/database/src/index';
import { books, editions, authors, bookAuthors, series, seriesBooks } from '../../packages/database/src/schema';

interface TransformedData {
  books: any[];
  editions: any[];
  authors: any[];
  bookAuthors: any[];
  series: any[];
  seriesBooks: any[];
}

export async function importV2Data(transformedDataPath: string, userId: string) {
  console.log('Starting v2 data import...');

  // Read transformed data
  const transformedData: TransformedData = JSON.parse(
    fs.readFileSync(transformedDataPath, 'utf-8')
  );

  try {
    // Import authors first (they're referenced by books)
    console.log('Importing authors...');
    const authorMap = new Map<string, string>(); // name -> id

    for (const author of transformedData.authors) {
      const [inserted] = await db.insert(authors).values(author).returning();
      authorMap.set(author.name, inserted.id);
    }
    console.log(`Imported ${transformedData.authors.length} authors`);

    // Import series
    console.log('Importing series...');
    const seriesMap = new Map<string, string>(); // name -> id

    for (const serie of transformedData.series) {
      const [inserted] = await db.insert(series).values(serie).returning();
      seriesMap.set(serie.name, inserted.id);
    }
    console.log(`Imported ${transformedData.series.length} series`);

    // Import books and editions
    console.log('Importing books and editions...');
    const bookMap = new Map<number, string>(); // index -> id

    for (let i = 0; i < transformedData.books.length; i++) {
      const book = transformedData.books[i];
      const edition = transformedData.editions[i];

      // Insert book
      const [insertedBook] = await db.insert(books).values(book).returning();
      bookMap.set(i, insertedBook.id);

      // Insert edition
      await db.insert(editions).values({
        ...edition,
        bookId: insertedBook.id,
      });

      // Link authors to book
      const bookAuthorLinks = transformedData.bookAuthors.filter(
        (ba) => ba.bookIndex === i
      );

      for (const link of bookAuthorLinks) {
        await db.insert(bookAuthors).values({
          bookId: insertedBook.id,
          authorId: authorMap.get(link.authorName)!,
          displayOrder: link.displayOrder,
        });
      }
    }
    console.log(`Imported ${transformedData.books.length} books with editions`);

    // Link books to series
    console.log('Linking books to series...');
    for (const link of transformedData.seriesBooks) {
      const seriesId = seriesMap.get(link.seriesName);
      const bookIndex = transformedData.books.findIndex(
        (b) => b.title === link.bookTitle
      );
      const bookId = bookMap.get(bookIndex);

      if (seriesId && bookId) {
        await db.insert(seriesBooks).values({
          seriesId,
          bookId,
          volumeNumber: link.volumeNumber,
        });
      }
    }
    console.log(`Linked ${transformedData.seriesBooks.length} books to series`);

    console.log('Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const transformedDataPath =
    process.argv[2] || './migration-data/transformed/transformed.json';
  const userId = process.argv[3] || 'default-user-id';

  importV2Data(transformedDataPath, userId)
    .then(() => {
      console.log('Migration successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
