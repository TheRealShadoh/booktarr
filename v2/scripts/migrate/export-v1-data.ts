/**
 * Export data from BookTarr v1 (SQLite)
 * Exports to JSON files for transformation
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

interface V1Book {
  isbn: string;
  title: string;
  authors: string;
  series_name?: string;
  series_position?: number;
  cover_url?: string;
  // ... other v1 fields
}

interface V1Series {
  name: string;
  total_volumes: number;
  // ... other v1 fields
}

export async function exportV1Data(v1DbPath: string, outputDir: string) {
  console.log('Starting v1 data export...');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Connect to v1 database
  const db = new Database(v1DbPath, { readonly: true });

  try {
    // Export books
    console.log('Exporting books...');
    const books = db.prepare('SELECT * FROM books').all() as V1Book[];
    fs.writeFileSync(
      path.join(outputDir, 'books.json'),
      JSON.stringify(books, null, 2)
    );
    console.log(`Exported ${books.length} books`);

    // Export series
    console.log('Exporting series...');
    const series = db.prepare('SELECT * FROM series').all() as V1Series[];
    fs.writeFileSync(
      path.join(outputDir, 'series.json'),
      JSON.stringify(series, null, 2)
    );
    console.log(`Exported ${series.length} series`);

    // Export reading progress
    console.log('Exporting reading progress...');
    const readingProgress = db.prepare('SELECT * FROM reading_progress').all();
    fs.writeFileSync(
      path.join(outputDir, 'reading_progress.json'),
      JSON.stringify(readingProgress, null, 2)
    );
    console.log(`Exported ${readingProgress.length} reading progress entries`);

    // Export metadata cache
    console.log('Exporting metadata cache...');
    const metadataCache = db.prepare('SELECT * FROM metadata_cache').all();
    fs.writeFileSync(
      path.join(outputDir, 'metadata_cache.json'),
      JSON.stringify(metadataCache, null, 2)
    );
    console.log(`Exported ${metadataCache.length} metadata cache entries`);

    console.log('Export complete!');
  } finally {
    db.close();
  }
}

// CLI usage
if (require.main === module) {
  const v1DbPath = process.argv[2] || '../backend/database/booktarr.db';
  const outputDir = process.argv[3] || './migration-data';

  exportV1Data(v1DbPath, outputDir)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Export failed:', error);
      process.exit(1);
    });
}
