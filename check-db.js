import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:C:/Users/chris/git/booktarr/v2/packages/database/local.db'
});

async function checkData() {
  console.log('\n=== Checking Series ===');
  const seriesResult = await db.execute('SELECT id, name, totalVolumes FROM series');
  console.log('Series:', seriesResult.rows);

  console.log('\n=== Checking SeriesBooks ===');
  const seriesBooksResult = await db.execute('SELECT id, seriesId, bookId, volumeNumber, volumeName FROM seriesBooks');
  console.log('SeriesBooks:', seriesBooksResult.rows);

  console.log('\n=== Checking SeriesVolumes ===');
  const seriesVolumesResult = await db.execute('SELECT id, seriesId, volumeNumber, title, bookId FROM seriesVolumes');
  console.log('SeriesVolumes:', seriesVolumesResult.rows);

  await db.close();
}

checkData().catch(console.error);
