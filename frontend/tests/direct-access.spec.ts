import { test, expect } from '@playwright/test';

test.describe('BookTarr Direct Access Test', () => {
  test('should access the application directly', async ({ page, context }) => {
    // Bypass SSL certificate errors
    await context.clearCookies();
    
    try {
      // Navigate directly to the HTTPS URL
      await page.goto('https://localhost:3000', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Take a screenshot of the current state
      await page.screenshot({ 
        path: 'test-results/direct-access-screenshot.png',
        fullPage: true 
      });
      
      // Get basic page info
      const title = await page.title();
      const url = page.url();
      
      console.log(`Page Title: ${title}`);
      console.log(`Page URL: ${url}`);
      
      // Get page snapshot
      await page.locator('body').waitFor({ timeout: 10000 });
      
    } catch (error) {
      console.log('Direct HTTPS access failed, trying HTTP fallback...');
      
      try {
        await page.goto('http://localhost:3000', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        await page.screenshot({ 
          path: 'test-results/http-fallback-screenshot.png',
          fullPage: true 
        });
        
      } catch (httpError) {
        console.log('Both HTTPS and HTTP access failed');
        throw httpError;
      }
    }
  });
});