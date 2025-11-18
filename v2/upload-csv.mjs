import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'sample_data', 'HandyLib.csv');

console.log('Reading CSV from:', csvPath);
const csvContent = readFileSync(csvPath, 'utf-8');
console.log('CSV size:', csvContent.length, 'bytes');

// Create FormData
const formData = new FormData();
const blob = new Blob([csvContent], { type: 'text/csv' });
formData.append('file', blob, 'HandyLib.csv');
formData.append('format', 'handylib');
formData.append('skipDuplicates', 'false');
formData.append('enrichMetadata', 'false');

console.log('\nUploading to http://localhost:3006/api/import/csv...');

// Need to get cookies from browser - for now let's try without auth
fetch('http://localhost:3006/api/import/csv', {
  method: 'POST',
  body: formData,
})
  .then(async (response) => {
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);

    try {
      const data = JSON.parse(text);
      if (data.jobId) {
        console.log('\n✅ Import job created:', data.jobId);
        console.log('Total rows:', data.totalRows);
      } else if (data.error) {
        console.log('\n❌ Error:', data.error);
      }
    } catch (e) {
      console.log('Could not parse JSON');
    }
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
  });
