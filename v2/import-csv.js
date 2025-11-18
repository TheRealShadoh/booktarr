import { readFileSync } from 'fs';
import { join } from 'path';

const csvPath = join(process.cwd(), '..', 'sample_data', 'HandyLib.csv');
const csvContent = readFileSync(csvPath, 'utf-8');

console.log('CSV file size:', csvContent.length, 'bytes');
console.log('Uploading to http://localhost:3006/api/import/csv...');

// Create form data
const formData = new FormData();
const blob = new Blob([csvContent], { type: 'text/csv' });
formData.append('file', blob, 'HandyLib.csv');
formData.append('format', 'handylib');
formData.append('skipDuplicates', 'false');
formData.append('enrichMetadata', 'false');

// Import with session cookie
fetch('http://localhost:3006/api/import/csv', {
  method: 'POST',
  body: formData,
  credentials: 'include',
})
  .then(async (response) => {
    const data = await response.json();
    console.log('Response:', data);

    if (data.jobId) {
      console.log('\nImport started! Job ID:', data.jobId);
      console.log('Total rows to import:', data.totalRows);
      console.log('\nChecking status...');

      // Poll job status
      const checkStatus = async () => {
        const statusResponse = await fetch(`http://localhost:3006/api/import/status/${data.jobId}`);
        const status = await statusResponse.json();
        console.log('Status:', status);

        if (status.job.status === 'completed' || status.job.status === 'failed') {
          console.log('\nFinal result:', status.job);
          process.exit(0);
        } else {
          setTimeout(checkStatus, 2000);
        }
      };

      setTimeout(checkStatus, 2000);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
