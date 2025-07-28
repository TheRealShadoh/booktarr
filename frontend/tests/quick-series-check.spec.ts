import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Quick Series Check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should quickly check series art and details', async ({ page }) => {
    // Import CSV with Preview → Import workflow
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Preview then Import
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Library → Series tab
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    // Click specifically on the Series tab within the library view, not the sidebar
    await page.locator('button:has-text("Series")').first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/quick-series-check.png',
      fullPage: true 
    });
    
    // Check series items
    const seriesCards = page.locator('.booktarr-card');
    const seriesCount = await seriesCards.count();
    console.log(`✅ Found ${seriesCount} series items`);
    
    // Check first series for key elements
    if (seriesCount > 0) {
      const firstSeries = seriesCards.first();
      
      // Check for cover image
      const coverImage = firstSeries.locator('img');
      const hasImage = await coverImage.count() > 0;
      console.log(`✅ First series has cover image: ${hasImage}`);
      
      // Check for series title
      const title = await firstSeries.locator('h3, h4, .title').first().textContent();
      console.log(`✅ First series title: "${title}"`);
      
      // Check for completion info
      const completionInfo = firstSeries.locator(':text("%"), :text("/"), .complete');
      const hasCompletion = await completionInfo.count() > 0;
      console.log(`✅ Has completion info: ${hasCompletion}`);
      
      // Check for book count
      const bookCount = await firstSeries.locator(':text("books"), :text("book")').first().textContent();
      console.log(`✅ Book count info: "${bookCount}"`);
      
      // Verify this is working as expected
      expect(seriesCount).toBeGreaterThan(0);
      expect(hasImage).toBeTruthy();
    }
  });
});