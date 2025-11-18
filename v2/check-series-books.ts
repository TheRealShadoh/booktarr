import { db } from './packages/database/src/index.js';
import { series, seriesBooks, books } from './packages/database/src/schema.js';
import { sql } from 'drizzle-orm';

async function checkSeriesBooks() {
  console.log('\\n=== Checking Series Records ===');
  const seriesRecords = await db.select().from(series);
  console.log(`Found ${seriesRecords.length} series:`,  seriesRecords.map(s => ({
    id: s.id,
    name: s.name,
    totalVolumes: s.totalVolumes
  })));

  console.log('\\n=== Checking SeriesBooks Records ===');
  const seriesBooksRecords = await db.select().from(seriesBooks);
  console.log(`Found ${seriesBooksRecords.length} seriesBooks records:`, seriesBooksRecords);

  console.log('\\n=== Checking Books with Blue Exorcist in title ===');
  const blueExorcistBooks = await db
    .select()
    .from(books)
    .where(sql`${books.title} LIKE '%Blue Exorcist%' OR ${books.title} LIKE '%青の祓魔師%'`);
  console.log(`Found ${blueExorcistBooks.length} Blue Exorcist books:`, blueExorcistBooks.map(b => ({
    id: b.id,
    title: b.title
  })));

  process.exit(0);
}

checkSeriesBooks().catch(console.error);
