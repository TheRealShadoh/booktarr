import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Simple CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should try the simplest CSV import workflow', async ({ page }) => {
    // Navigate to import
    await page.click('text=Settings');
    await page.click('text=Import');
    
    await page.screenshot({ 
      path: 'test-results/simple-01-import-page.png',
      fullPage: true 
    });
    
    // Upload CSV file first before clicking anything
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/simple-02-file-uploaded.png',
      fullPage: true 
    });
    
    // Now click on the CSV card directly (not just the text)
    const csvCard = page.locator('.booktarr-card:has-text("CSV")');
    await csvCard.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/simple-03-csv-card-clicked.png',
      fullPage: true 
    });
    
    // Look for any processing or import UI
    const importUI = await page.textContent('body');
    console.log('Page content preview:', importUI?.substring(0, 300));
    
    // Check if books appeared in any form
    const hasBookData = importUI?.includes('From Blood') || importUI?.includes('Jennifer') || importUI?.includes('Armentrout');
    console.log('Page has book data:', hasBookData);
    
    // Wait a bit more and check for any changes
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: 'test-results/simple-04-after-wait.png',
      fullPage: true 
    });
    
    // Try navigating to library to see if books imported
    await page.click('text=Library');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/simple-05-library-check.png',
      fullPage: true 
    });
    
    // Check book count
    const bookCards = page.locator('.booktarr-card');
    const bookCount = await bookCards.count();
    console.log(`Books found in library: ${bookCount}`);
    
    // Check if we can see the "From Blood and Ash" book
    const libraryText = await page.textContent('body');
    const hasFromBlood = libraryText?.includes('From Blood');
    console.log('Library contains "From Blood":', hasFromBlood);
    
    // Try the Series tab
    const seriesTab = page.locator('button:has-text("Series")').first();
    if (await seriesTab.count() > 0) {
      await seriesTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/simple-06-series-tab.png',
        fullPage: true 
      });
      
      const seriesCards = page.locator('.booktarr-card');
      const seriesCount = await seriesCards.count();
      console.log(`Series found: ${seriesCount}`);
    }
  });
  
  test('should try direct import without preview workflow', async ({ page }) => {
    // Navigate to import
    await page.click('text=Settings');
    await page.click('text=Import');
    
    // Click CSV option first
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    // Upload file
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/direct-01-file-uploaded.png',
      fullPage: true 
    });
    
    // Skip Preview and click Import directly
    const importButton = page.locator('button:has-text("Import")').first();
    if (await importButton.count() > 0) {
      console.log('Clicking Import button directly...');
      await importButton.click();
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'test-results/direct-02-import-clicked.png',
        fullPage: true 
      });
    }
    
    // Check for success/error messages
    const messages = page.locator('.message, .notification, .toast, .alert, .success, .error');
    const messageCount = await messages.count();
    console.log(`Messages after import: ${messageCount}`);
    
    if (messageCount > 0) {
      for (let i = 0; i < messageCount; i++) {
        const messageText = await messages.nth(i).textContent();
        console.log(`Message ${i}: "${messageText}"`);
      }
    }
    
    // Navigate to library to verify import
    await page.click('text=Library');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/direct-03-library-result.png',
      fullPage: true 
    });
    
    const bookCards = page.locator('.booktarr-card');
    const finalBookCount = await bookCards.count();
    console.log(`Final book count in library: ${finalBookCount}`);
    
    // This should succeed if import worked
    expect(finalBookCount).toBeGreaterThan(0);
  });
});