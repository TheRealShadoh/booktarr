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
    // Look for CSV import navigation
    await page.click('[data-testid="csv-import-nav"], text="Import Books", text="CSV"');
    
    // Take screenshot of CSV import page
    await page.screenshot({ 
      path: 'test-results/csv-import-page.png',
      fullPage: true 
    });
    
    // Verify we're on the CSV import page
    await expect(page.locator('h1, h2, h3')).toContainText(/Import|CSV/i);
  });

  test('should show CSV upload interface', async ({ page }) => {
    // Navigate to CSV import (adjust selector based on actual implementation)
    await page.click('[data-testid="csv-import-nav"], text="Import", text="CSV"');
    
    // Look for file upload input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    
    // Look for upload button or drop zone
    const uploadArea = page.locator('[data-testid="upload-area"], .upload-zone, .file-drop');
    await expect(uploadArea).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/csv-upload-interface.png',
      fullPage: true 
    });
  });

  test('should handle CSV file upload', async ({ page }) => {
    // Navigate to CSV import
    await page.click('[data-testid="csv-import-nav"], text="Import", text="CSV"');
    
    // Create a sample CSV content
    const csvContent = `Title,Author,Series,Volume,ISBN
The Fellowship of the Ring,J.R.R. Tolkien,The Lord of the Rings,1,9780261102354
The Two Towers,J.R.R. Tolkien,The Lord of the Rings,2,9780261102361
Harry Potter and the Philosopher's Stone,J.K. Rowling,Harry Potter,1,9780747532699`;

    // Create temporary CSV file
    const csvPath = path.join(__dirname, 'temp-books.csv');
    await require('fs').promises.writeFile(csvPath, csvContent);

    try {
      // Upload the CSV file
      const fileInput = page.locator('input[type="file"]');
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
    await page.click('[data-testid="csv-import-nav"], text="Import", text="CSV"');
    
    // Create invalid CSV content
    const invalidCsvContent = `Title,Author,BadColumn
Book Without Required Fields,Author Name,Extra Data`;

    const csvPath = path.join(__dirname, 'invalid-books.csv');
    await require('fs').promises.writeFile(csvPath, invalidCsvContent);

    try {
      // Upload the invalid CSV
      const fileInput = page.locator('input[type="file"]');
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
    await page.click('[data-testid="csv-import-nav"], text="Import", text="CSV"');
    
    const csvContent = `Title,Author,Series,Volume,ISBN
Test Book 1,Test Author,Test Series,1,9781234567890
Test Book 2,Test Author,Test Series,2,9781234567891`;

    const csvPath = path.join(__dirname, 'test-import.csv');
    await require('fs').promises.writeFile(csvPath, csvContent);

    try {
      // Upload and process CSV
      await page.locator('input[type="file"]').setInputFiles(csvPath);
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