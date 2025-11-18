import { readFileSync } from 'fs';
import { join } from 'path';
import { CSVImportService } from './apps/web/src/lib/services/csv-import';

// Read CSV file
const csvPath = join(__dirname, '..', 'sample_data', 'HandyLib.csv');
const csvContent = readFileSync(csvPath, 'utf-8');

console.log('CSV file loaded:', csvContent.length, 'bytes');

// Get the test user ID (hardcoded from earlier test)
const userId = '1d195f62-cd4a-4a29-ac1e-6207b65dbb16'; // test@example.com

console.log('Importing for user:', userId);

const csvImport = new CSVImportService();

csvImport.importHandyLibCSV(csvContent, userId, {
  skipDuplicates: false,
  enrichMetadata: false,
  onProgress: (processed, success, failed) => {
    if (processed % 10 === 0) {
      console.log(`Progress: ${processed} processed, ${success} success, ${failed} failed`);
    }
  },
})
  .then((result) => {
    console.log('\n✅ Import complete!');
    console.log('Success:', result.success);
    console.log('Failed:', result.failed);
    console.log('Errors:', result.errors.length);

    if (result.errors.length > 0) {
      console.log('\nFirst 5 errors:');
      result.errors.slice(0, 5).forEach((error) => {
        console.log(`  Row ${error.row}: ${error.error}`);
      });
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
