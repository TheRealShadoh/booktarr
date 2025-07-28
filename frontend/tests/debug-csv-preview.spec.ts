import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Debug CSV Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should debug what happens after Preview is clicked', async ({ page }) => {
    // Navigate and upload CSV
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);
    
    // Click Preview
    const previewButton = page.locator('button:has-text("Preview")');
    await previewButton.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/debug-after-preview.png',
      fullPage: true 
    });
    
    // Scroll down to see if preview content appears below
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/debug-after-scroll.png',
      fullPage: true 
    });
    
    // Look for different preview selectors
    const previewSelectors = [
      '.preview',
      '.csv-preview', 
      '.book-preview',
      '[data-testid="preview"]',
      '.import-preview',
      '.books-preview',
      '.preview-section',
      '.preview-content'
    ];
    
    for (const selector of previewSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`Found ${count} elements with selector: ${selector}`);
      }
    }
    
    // Look for any tables (CSV data might be in a table)
    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`Found ${tableCount} tables`);
    
    // Look for any lists
    const lists = page.locator('ul, ol');
    const listCount = await lists.count();
    console.log(`Found ${listCount} lists`);
    
    // Check for any new content that appeared after Preview
    const bodyText = await page.textContent('body');
    const hasFromBloodAndAsh = bodyText?.includes('From Blood and Ash');
    const hasJennifer = bodyText?.includes('Jennifer');
    const hasArmentrout = bodyText?.includes('Armentrout');
    
    console.log(`Page contains "From Blood and Ash": ${hasFromBloodAndAsh}`);
    console.log(`Page contains "Jennifer": ${hasJennifer}`);
    console.log(`Page contains "Armentrout": ${hasArmentrout}`);
    
    // Check if Import button became visible/enabled after preview
    const importButtons = page.locator('button:has-text("Import")');
    const importCount = await importButtons.count();
    console.log(`Found ${importCount} Import buttons`);
    
    for (let i = 0; i < importCount; i++) {
      const button = importButtons.nth(i);
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      const text = await button.textContent();
      console.log(`Import button ${i}: "${text}" (visible: ${isVisible}, enabled: ${isEnabled})`);
    }
    
    // Try clicking Import anyway to see what happens
    if (importCount > 0) {
      console.log('Attempting to click Import button...');
      await importButtons.first().click();
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'test-results/debug-after-import.png',
        fullPage: true 
      });
      
      // Check for success/error messages
      const messages = page.locator('.message, .notification, .toast, .alert');
      const messageCount = await messages.count();
      console.log(`Found ${messageCount} message elements after import`);
      
      if (messageCount > 0) {
        for (let i = 0; i < messageCount; i++) {
          const messageText = await messages.nth(i).textContent();
          console.log(`Message ${i}: "${messageText}"`);
        }
      }
    }
  });
});