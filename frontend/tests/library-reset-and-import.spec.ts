import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('Complete Library Reset and Import Validation', () => {
  test.setTimeout(300000); // 5 minutes for complete import process

  test('should reset library, import CSV, and validate series counts', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 1: Navigate to Settings page
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot before reset
    await page.screenshot({ 
      path: 'test-results/before-library-reset.png',
      fullPage: true 
    });

    // Step 2: Reset the library completely
    console.log('🔄 Resetting library...');
    await page.click('button:has-text("Remove All Books & Series")');
    
    // Handle DELETE confirmation modal
    await page.waitForSelector('input[placeholder="Type DELETE to confirm"]');
    await page.fill('input[placeholder="Type DELETE to confirm"]', 'DELETE');
    await page.click('button:has-text("Confirm Deletion")');
    
    // Wait for reset to complete
    await page.waitForSelector('text=All books and series have been removed successfully');
    console.log('✅ Library reset completed');
    
    // Take screenshot after reset
    await page.screenshot({ 
      path: 'test-results/after-library-reset.png',
      fullPage: true 
    });

    // Step 3: Navigate to Import page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify library is empty
    const bookCountBefore = await page.textContent('[data-testid="book-count"]');
    expect(bookCountBefore).toContain('0 books total');
    console.log('✅ Confirmed library is empty');

    // Step 4: Import CSV file
    console.log('📂 Starting CSV import...');
    
    // Create the CSV file content to upload
    const csvPath = join(process.cwd(), '..', 'sample_data', 'HandyLib.csv');
    
    // Upload the CSV file via API
    const fileBuffer = readFileSync(csvPath);
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

    expect(importResponse.ok()).toBeTruthy();
    const importResult = await importResponse.json();
    console.log(`📚 Import result: ${importResult.imported} books imported, ${importResult.errors?.length || 0} errors`);
    
    // Wait for import to complete and page to refresh
    await page.waitForTimeout(10000); // Wait 10 seconds for import processing
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 5: Validate total book count
    console.log('🔍 Validating book import...');
    const bookCountAfter = await page.textContent('[data-testid="book-count"]');
    expect(bookCountAfter).toContain('314 books total');
    console.log('✅ Confirmed 314 books imported successfully');
    
    // Take screenshot after import
    await page.screenshot({ 
      path: 'test-results/after-csv-import.png',
      fullPage: true 
    });

    // Step 6: Navigate to Series Management
    await page.click('button:has-text("Series Management")');
    await page.waitForLoadState('networkidle');
    
    // Wait for series to load
    await page.waitForSelector('[data-testid="series-list"]', { timeout: 30000 });
    
    // Take screenshot of series management
    await page.screenshot({ 
      path: 'test-results/series-management-after-import.png',
      fullPage: true 
    });

    // Step 7: Find and validate Bleach series
    console.log('🔍 Searching for Bleach series...');
    
    // Look for Bleach in the series list
    const bleachSeriesCard = page.locator('text=Bleach').first();
    await expect(bleachSeriesCard).toBeVisible({ timeout: 30000 });
    
    // Get the parent card that contains the volume information
    const bleachCard = bleachSeriesCard.locator('xpath=ancestor::*[contains(@class, "series") or contains(@role, "button")]').first();
    
    // Extract volume information from the card
    const volumeText = await bleachCard.textContent();
    console.log(`📊 Bleach series card text: ${volumeText}`);
    
    // Validate the volume count - should show something like "4/75 volumes" or "4/74 volumes"
    const volumeMatch = volumeText?.match(/(\d+)\/(\d+)\s*volumes?/i);
    if (volumeMatch) {
      const owned = parseInt(volumeMatch[1]);
      const total = parseInt(volumeMatch[2]);
      
      console.log(`📚 Bleach volumes: ${owned}/${total}`);
      
      // Validate owned volumes (should be around 4)
      expect(owned).toBeGreaterThanOrEqual(3);
      expect(owned).toBeLessThanOrEqual(5);
      
      // Validate total volumes (should be 74 or 75)
      expect(total).toBeGreaterThanOrEqual(74);
      expect(total).toBeLessThanOrEqual(75);
      
      console.log('✅ Bleach volume count validation passed');
    } else {
      throw new Error(`Could not parse volume information from: ${volumeText}`);
    }
    
    // Step 8: Click on Bleach series to view details
    await bleachSeriesCard.click();
    await page.waitForLoadState('networkidle');
    
    // Verify series details page shows correct total volumes
    const seriesDetailsText = await page.textContent('[data-testid="series-details"]');
    if (seriesDetailsText) {
      console.log(`📖 Bleach series details: ${seriesDetailsText}`);
      
      // Check for "Total Volumes: 74" or "Total Volumes: 75"
      const totalVolumeMatch = seriesDetailsText.match(/Total Volumes:\s*(\d+)/i);
      if (totalVolumeMatch) {
        const totalVolumes = parseInt(totalVolumeMatch[1]);
        expect(totalVolumes).toBeGreaterThanOrEqual(74);
        expect(totalVolumes).toBeLessThanOrEqual(75);
        console.log('✅ Series details page shows correct total volumes');
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/bleach-series-details-final.png',
      fullPage: true 
    });

    // Step 9: Validate completion percentage
    const completionText = await page.textContent('[data-testid="completion-percentage"]');
    if (completionText) {
      const completionMatch = completionText.match(/(\d+)%/);
      if (completionMatch) {
        const completionPercentage = parseInt(completionMatch[1]);
        // With 4 owned out of 74-75 total, completion should be around 5-6%
        expect(completionPercentage).toBeGreaterThanOrEqual(4);
        expect(completionPercentage).toBeLessThanOrEqual(7);
        console.log(`✅ Completion percentage validation passed: ${completionPercentage}%`);
      }
    }

    console.log('🎉 All validations passed! Library reset and import working correctly.');
  });

  test('should validate series metadata persistence after import', async ({ page }) => {
    // This test checks that series metadata is properly cached and persists
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Series Management
    await page.click('button:has-text("Series Management")');
    await page.waitForLoadState('networkidle');
    
    // Get list of all series with their volume counts
    const seriesList = await page.locator('[data-testid="series-list"] [data-testid="series-card"]').all();
    const seriesData = [];
    
    for (const seriesCard of seriesList) {
      const text = await seriesCard.textContent();
      const nameMatch = text?.match(/^([^\\n]+)/);
      const volumeMatch = text?.match(/(\d+)\/(\d+)\s*volumes?/i);
      
      if (nameMatch && volumeMatch) {
        seriesData.push({
          name: nameMatch[1].trim(),
          owned: parseInt(volumeMatch[1]),
          total: parseInt(volumeMatch[2])
        });
      }
    }
    
    console.log(`📊 Found ${seriesData.length} series with metadata`);
    
    // Validate that we have series with meaningful total counts
    const seriesWithGoodMetadata = seriesData.filter(s => s.total > s.owned && s.total > 1);
    expect(seriesWithGoodMetadata.length).toBeGreaterThan(10); // Should have many series with external metadata
    
    // Validate Bleach specifically
    const bleachSeries = seriesData.find(s => s.name.toLowerCase().includes('bleach'));
    if (bleachSeries) {
      expect(bleachSeries.total).toBeGreaterThanOrEqual(74);
      console.log(`✅ Bleach metadata validated: ${bleachSeries.owned}/${bleachSeries.total} volumes`);
    }
    
    console.log('✅ Series metadata persistence validation passed');
  });
});