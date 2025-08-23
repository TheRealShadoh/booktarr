import { test, expect } from '@playwright/test';

test.describe('Design Review Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should verify critical design issues are resolved', async ({ page }) => {
    console.log('=== Design Review Verification Test ===');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/design-review-main-page.png',
      fullPage: true 
    });
    
    // Check console messages before and after navigation
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Verify Library Page Loading
    console.log('Testing Library Page...');
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/design-review-library-page.png',
      fullPage: true 
    });
    
    // Check for books display
    const booksDisplay = await page.locator('.library-grid, [data-testid="book-card"], .book-card').count();
    console.log(`Found ${booksDisplay} book elements`);
    
    // Verify Series Page
    console.log('Testing Series Page...');
    await page.click('text=Series Management');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/design-review-series-page.png',
      fullPage: true 
    });
    
    // Check series completion ratios
    const seriesElements = await page.locator('[data-testid="series-card"], .series-card').count();
    console.log(`Found ${seriesElements} series elements`);
    
    // Test Settings Page  
    console.log('Testing Settings Page...');
    await page.click('text=Settings');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/design-review-settings-page.png',
      fullPage: true 
    });
    
    // Check for favicon and icons
    console.log('Checking favicon and manifest icons...');
    const faviconResponse = await page.request.get('/favicon.ico');
    console.log(`Favicon status: ${faviconResponse.status()}`);
    
    const logo192Response = await page.request.get('/logo192.png');
    console.log(`Logo192 status: ${logo192Response.status()}`);
    
    // Test responsive design
    console.log('Testing responsive design...');
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ 
      path: 'test-results/design-review-desktop.png',
      fullPage: true 
    });
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'test-results/design-review-tablet.png',
      fullPage: true 
    });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'test-results/design-review-mobile.png',
      fullPage: true 
    });
    
    // Log all console messages
    console.log('=== Console Messages Summary ===');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errorMessages.length}`);
    console.log(`Warnings: ${warningMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('=== Error Messages ===');
      errorMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
      });
    }
    
    if (warningMessages.length > 0) {
      console.log('=== Warning Messages ===');
      warningMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
      });
    }
    
    // API Health Check
    console.log('=== API Health Check ===');
    const healthResponse = await page.request.get('/api/health');
    console.log(`Health API: ${healthResponse.status()}`);
    
    const booksResponse = await page.request.get('/api/books');
    console.log(`Books API: ${booksResponse.status()}`);
    
    const settingsResponse = await page.request.get('/api/settings');
    console.log(`Settings API: ${settingsResponse.status()}`);
    
    // Verify no critical blocking issues
    expect(errorMessages.filter(msg => 
      msg.text.includes('Cannot read') || 
      msg.text.includes('undefined') ||
      msg.text.includes('TypeError')
    ).length).toBe(0);
    
    // Basic functionality assertions
    expect(await page.locator('h1, h2').count()).toBeGreaterThan(0);
    expect(healthResponse.status()).toBe(200);
  });
});