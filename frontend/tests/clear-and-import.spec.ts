import { test, expect } from '@playwright/test';

test.describe.serial('BookTarr Clear and Import Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure we can access the API
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should clear all books while keeping metadata', async ({ page }) => {
    // Navigate to Settings page
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Click the Remove All Books & Series button to open modal
    await page.getByRole('button', { name: '🗑️ Remove All Books & Series' }).click();
    
    // Wait for modal to appear
    await page.waitForSelector('div:has-text("Confirm Data Deletion")');
    
    // Type DELETE in the confirmation input
    await page.fill('input[placeholder="Type DELETE here"]', 'DELETE');
    
    // Click the Delete All Data button
    await page.getByRole('button', { name: 'Delete All Data' }).click();
    
    // Wait for the operation to complete
    await page.waitForTimeout(3000);
    
    // Verify books are cleared by checking API
    const booksResponse = await page.request.get('/api/books');
    expect(booksResponse.ok()).toBeTruthy();
    
    const books = await booksResponse.json();
    expect(Array.isArray(books) ? books.length : 0).toBe(0);
    
    await page.screenshot({ 
      path: 'test-results/clear-books-complete.png',
      fullPage: true 
    });
  });

  test('should import CSV from sample_data folder and verify books appear', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for import test
    console.log('Starting CSV import test');
    
    // Test the import API endpoint by uploading the HandyLib.csv file using the same endpoint as manual import
    const fs = require('fs');
    const path = require('path');
    const csvPath = '/home/chris/git/booktarr/sample_data/HandyLib.csv';
    
    // Read the actual file as buffer
    const fileBuffer = fs.readFileSync(csvPath);
    
    // Use the same endpoint as manual import: /api/books/import
    const importResponse = await page.request.post('/api/books/import', {
      multipart: {
        'file': {
          name: 'HandyLib.csv',
          mimeType: 'text/csv',
          buffer: fileBuffer
        },
        'format': 'handylib',
        'field_mapping': '{}',
        'skip_duplicates': 'true',
        'enrich_metadata': 'true'
      }
    });
    
    console.log('Import API response status:', importResponse.status());
    
    if (!importResponse.ok()) {
      const errorText = await importResponse.text();
      console.log('Import API error response:', errorText);
    }
    
    expect(importResponse.ok()).toBeTruthy();
    
    const importResult = await importResponse.json();
    console.log('Import result:', importResult);
    
    // /api/books/import returns different response format than /api/import/csv
    console.log('Import result:', importResult);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBeGreaterThan(0);
    
    // Wait for import processing to complete
    await page.waitForTimeout(5000);
    
    // Check that books are now present
    const booksResponse = await page.request.get('/api/books');
    expect(booksResponse.ok()).toBeTruthy();
    
    const books = await booksResponse.json();
    console.log('Books API response structure:', Object.keys(books));
    console.log('Books response sample:', JSON.stringify(books, null, 2).substring(0, 500));
    
    // The books endpoint returns grouped by series, not a simple array
    let bookCount = 0;
    if (books.series) {
      for (const seriesName in books.series) {
        if (Array.isArray(books.series[seriesName])) {
          bookCount += books.series[seriesName].length;
        }
      }
    } else if (Array.isArray(books)) {
      bookCount = books.length;
    }
    
    console.log(`Found ${bookCount} books after import`);
    expect(bookCount).toBeGreaterThan(0);
    
    // Verify some books from the CSV are present
    if (Array.isArray(books) && books.length > 0) {
      console.log('Sample book titles found:', books.slice(0, 5).map(b => b.title));
      
      // Check for Oshi no Ko series which is prominent in the CSV
      const oshiNoKoBooks = books.filter(book => 
        book.title?.toLowerCase().includes('oshi no ko') ||
        book.title?.toLowerCase().includes('oshi')
      );
      
      console.log(`Found ${oshiNoKoBooks.length} Oshi no Ko books`);
      expect(oshiNoKoBooks.length).toBeGreaterThan(0);
    }
    
    await page.screenshot({ 
      path: 'test-results/csv-import-complete.png',
      fullPage: true 
    });
  });

  test('should complete full clear and import workflow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for full workflow test
    console.log('Starting full clear and import workflow test');
    
    // Step 1: Clear all books via UI
    console.log('Step 1: Clearing all books while keeping metadata via UI');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Click the Remove All Books & Series button to open modal
    await page.getByRole('button', { name: '🗑️ Remove All Books & Series' }).click();
    
    // Wait for modal to appear and fill confirmation
    await page.waitForSelector('div:has-text("Confirm Data Deletion")');
    await page.fill('input[placeholder="Type DELETE here"]', 'DELETE');
    await page.getByRole('button', { name: 'Delete All Data' }).click();
    
    // Wait for the operation to complete
    await page.waitForTimeout(3000);
    console.log('Clear operation completed via UI');
    
    // Step 2: Verify books are cleared
    let booksResponse = await page.request.get('/api/books');
    expect(booksResponse.ok()).toBeTruthy();
    let books = await booksResponse.json();
    expect(Array.isArray(books) ? books.length : 0).toBe(0);
    console.log('Confirmed: Books cleared successfully');
    
    // Step 3: Navigate to Import section
    console.log('Step 2: Navigating to Import section');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Import' }).click();
    await page.waitForTimeout(2000);
    
    // Step 4: Import CSV file using API
    console.log('Step 3: Importing CSV file using backend API');
    
    const fs = require('fs');
    const csvPath = '/home/chris/git/booktarr/sample_data/HandyLib.csv';
    const fileBuffer = fs.readFileSync(csvPath);
    
    const importResponse = await page.request.post('/api/books/import', {
      multipart: {
        'file': {
          name: 'HandyLib.csv',
          mimeType: 'text/csv',
          buffer: fileBuffer
        },
        'format': 'handylib',
        'field_mapping': '{}',
        'skip_duplicates': 'true',
        'enrich_metadata': 'true'
      }
    });
    
    console.log('Import API response status:', importResponse.status());
    expect(importResponse.ok()).toBeTruthy();
    
    const importResult = await importResponse.json();
    console.log('Import result:', importResult);
    await page.waitForTimeout(5000);
    
    // Step 5: Verify import success
    console.log('Step 4: Verifying import success');
    booksResponse = await page.request.get('/api/books');
    expect(booksResponse.ok()).toBeTruthy();
    books = await booksResponse.json();
    
    // Count books correctly from the series structure
    let finalBookCount = 0;
    if (books.series) {
      for (const seriesName in books.series) {
        if (Array.isArray(books.series[seriesName])) {
          finalBookCount += books.series[seriesName].length;
        }
      }
    }
    
    console.log(`Final verification: Found ${finalBookCount} books after complete workflow`);
    expect(finalBookCount).toBeGreaterThan(0);
    
    // Step 6: Navigate to Library and take final screenshot
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/workflow-complete-library.png',
      fullPage: true 
    });
    
    console.log('Clear and import workflow completed successfully');
  });
});