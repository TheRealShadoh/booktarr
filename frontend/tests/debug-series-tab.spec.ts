import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Debug Series Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should debug series tab navigation and content', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/debug-preview-screen.png',
        fullPage: true 
      });
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Library
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/debug-library-view.png',
      fullPage: true 
    });
    
    // Look for all available tabs
    const tabs = page.locator('button, .tab, [role="tab"]');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} potential tabs`);
    
    for (let i = 0; i < Math.min(tabCount, 10); i++) {
      const tab = tabs.nth(i);
      const tabText = await tab.textContent();
      console.log(`Tab ${i}: "${tabText}"`);
    }
    
    // Look specifically for Series-related elements
    const seriesElements = page.locator(':text("Series"), :text("series")');
    const seriesCount = await seriesElements.count();
    console.log(`Found ${seriesCount} elements containing 'Series' or 'series'`);
    
    for (let i = 0; i < seriesCount; i++) {
      const element = seriesElements.nth(i);
      const text = await element.textContent();
      console.log(`Series element ${i}: "${text}"`);
    }
    
    // Try clicking on Series tab
    const seriesTab = page.locator('text="Series"').first();
    if (await seriesTab.count() > 0) {
      console.log('Clicking on Series tab');
      await seriesTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/debug-series-tab-clicked.png',
        fullPage: true 
      });
      
      // Count series items after clicking
      const seriesItems = page.locator('.series-card, [data-testid="series-item"], .series-item, .booktarr-card');
      const itemCount = await seriesItems.count();
      console.log(`Found ${itemCount} series items after clicking Series tab`);
      
      // Look for any content in the series view
      const content = page.locator('main, .content, .series-content');
      if (await content.count() > 0) {
        const contentText = await content.first().textContent();
        console.log(`Series content preview: ${contentText?.substring(0, 200)}...`);
      }
    }
  });
});