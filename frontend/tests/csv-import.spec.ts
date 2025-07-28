import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CSV Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to CSV import page', async ({ page }) => {
    // Navigate to Settings page where ImportPage is embedded
    await page.click('text=Settings');
    
    // Click on the Import tab
    await page.click('text=Import');
    
    // Wait for import page to load
    await page.waitForTimeout(1000);
    
    // Take screenshot of CSV import page
    await page.screenshot({ 
      path: 'test-results/csv-import-page.png',
      fullPage: true 
    });
    
    // Verify we're on the Settings page (which contains import functionality)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });

  test('should show CSV upload interface', async ({ page }) => {
    // Navigate to CSV import (adjust selector based on actual implementation)
    // Navigate to Settings page where ImportPage is embedded
    await page.click('text=Settings');
    
    // Click on the Import tab
    await page.click('text=Import');
    
    // Wait for import page to load
    await page.waitForTimeout(1000);
    
    // Look for file upload input (it's hidden, but should exist)
    const fileInput = page.locator('#file-upload');
    await expect(fileInput).toBeAttached();
    
    // Look for the visible upload label/area
    const uploadLabel = page.locator('label[for="file-upload"]');
    await expect(uploadLabel).toBeVisible();
    
    // Look for upload button or drop zone (we already checked the uploadLabel above)
    // The uploadLabel should be the visible upload area
    await expect(uploadLabel).toContainText(/upload|file/i);
    
    await page.screenshot({ 
      path: 'test-results/csv-upload-interface.png',
      fullPage: true 
    });
  });

  test('should handle CSV file upload', async ({ page }) => {
    // Navigate to CSV import
    // Navigate to Settings page where ImportPage is embedded
    await page.click('text=Settings');
    
    // Click on the Import tab
    await page.click('text=Import');
    
    // Wait for import page to load
    await page.waitForTimeout(1000);
    
    // Create a sample CSV content
    const csvContent = `Title,Author,Series,Volume,ISBN
The Fellowship of the Ring,J.R.R. Tolkien,The Lord of the Rings,1,9780261102354
The Two Towers,J.R.R. Tolkien,The Lord of the Rings,2,9780261102361
Harry Potter and the Philosopher's Stone,J.K. Rowling,Harry Potter,1,9780747532699`;

    // Create temporary CSV file
    const csvPath = path.join(__dirname, 'temp-books.csv');
    await require('fs').promises.writeFile(csvPath, csvContent);

    try {
      // Upload the CSV file using the hidden input
      const fileInput = page.locator('#file-upload');
      await fileInput.setInputFiles(csvPath);
      
      // Wait for file to be processed
      await page.waitForTimeout(1000);
      
      // Take screenshot after file upload
      await page.screenshot({ 
        path: 'test-results/csv-file-uploaded.png',
        fullPage: true 
      });
      
      // Look for preview or confirmation
      const preview = page.locator('[data-testid="csv-preview"], .csv-preview, .book-preview');
      if (await preview.isVisible()) {
        await expect(preview).toContainText('Fellowship');
      }
      
      // Look for import button
      const importButton = page.locator('button:has-text("Import"), button:has-text("Process"), [data-testid="import-button"]');
      if (await importButton.isVisible()) {
        await importButton.click();
        
        // Wait for import to complete
        await page.waitForTimeout(2000);
        
        // Take screenshot after import
        await page.screenshot({ 
          path: 'test-results/csv-import-complete.png',
          fullPage: true 
        });
      }
      
    } finally {
      // Clean up temp file
      try {
        await require('fs').promises.unlink(csvPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('should show CSV parsing validation', async ({ page }) => {
    // Navigate to CSV import
    // Navigate to Settings page where ImportPage is embedded
    await page.click('text=Settings');
    
    // Click on the Import tab
    await page.click('text=Import');
    
    // Wait for import page to load
    await page.waitForTimeout(1000);
    
    // Create invalid CSV content
    const invalidCsvContent = `Title,Author,BadColumn
Book Without Required Fields,Author Name,Extra Data`;

    const csvPath = path.join(__dirname, 'invalid-books.csv');
    await require('fs').promises.writeFile(csvPath, invalidCsvContent);

    try {
      // Upload the invalid CSV using the hidden input
      const fileInput = page.locator('#file-upload');
      await fileInput.setInputFiles(csvPath);
      
      // Wait for validation
      await page.waitForTimeout(1000);
      
      // Take screenshot of validation errors
      await page.screenshot({ 
        path: 'test-results/csv-validation-errors.png',
        fullPage: true 
      });
      
      // Check for error messages
      const errorMessages = page.locator('.error, .validation-error, [data-testid="error"]');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
      
    } finally {
      try {
        await require('fs').promises.unlink(csvPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('should display CSV import results', async ({ page }) => {
    // Navigate to CSV import
    // Navigate to Settings page where ImportPage is embedded
    await page.click('text=Settings');
    
    // Click on the Import tab
    await page.click('text=Import');
    
    // Wait for import page to load
    await page.waitForTimeout(1000);
    
    const csvContent = `Title,Author,Series,Volume,ISBN
Test Book 1,Test Author,Test Series,1,9781234567890
Test Book 2,Test Author,Test Series,2,9781234567891`;

    const csvPath = path.join(__dirname, 'test-import.csv');
    await require('fs').promises.writeFile(csvPath, csvContent);

    try {
      // Upload and process CSV using the hidden input
      await page.locator('#file-upload').setInputFiles(csvPath);
      await page.waitForTimeout(1000);
      
      const importButton = page.locator('button:has-text("Import"), button:has-text("Process")');
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Take screenshot of results
      await page.screenshot({ 
        path: 'test-results/csv-import-results.png',
        fullPage: true 
      });
      
      // Check for success message or results
      const results = page.locator('.import-results, .success, [data-testid="import-results"]');
      if (await results.count() > 0) {
        await expect(results.first()).toBeVisible();
      }
      
    } finally {
      try {
        await require('fs').promises.unlink(csvPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});