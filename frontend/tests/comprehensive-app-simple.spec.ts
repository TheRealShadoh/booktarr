import { test, expect } from '@playwright/test';

test.describe('BookTarr Basic App Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load main page and verify basic layout', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Booktarr/);
    
    // Verify main navigation elements are present (use role-based selectors)
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    
    // Verify layout structure
    await expect(page.locator('nav, .sidebar')).toBeVisible();
    await expect(page.locator('main, .content')).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/main-page-layout.png',
      fullPage: true 
    });
  });

  test('should navigate to library page', async ({ page }) => {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForLoadState('networkidle');
    
    // Check that we're on library page by looking for page heading
    await expect(page.getByRole('heading', { name: /library/i })).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/library-page.png',
      fullPage: true 
    });
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Check that we're on settings page by looking for page heading
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/settings-page.png',
      fullPage: true 
    });
  });

  test('should verify API health endpoint', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'healthy');
  });

  test('should verify books API endpoint', async ({ page }) => {
    const response = await page.request.get('/api/books');
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('should verify settings API endpoint', async ({ page }) => {
    const response = await page.request.get('/api/settings');
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    const invalidResponse = await page.request.get('/api/invalid-endpoint');
    expect(invalidResponse.status()).toBe(404);
  });

  test('should test settings navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Try to click on Import tab if it exists
    const importTab = page.locator('button:has-text("Import")').first();
    if (await importTab.count() > 0) {
      await importTab.click();
      await page.waitForTimeout(500);
    }
    
    // Try to click on Jobs tab if it exists
    const jobsTab = page.locator('button:has-text("Jobs")').first();
    if (await jobsTab.count() > 0) {
      await jobsTab.click();
      await page.waitForTimeout(500);
    }
    
    // Try to click on Logs tab if it exists
    const logsTab = page.locator('button:has-text("Logs")').first();
    if (await logsTab.count() > 0) {
      await logsTab.click();
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ 
      path: 'test-results/settings-navigation.png',
      fullPage: true 
    });
  });

  test('should test library tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForLoadState('networkidle');
    
    // Try to click on Books tab if it exists
    const booksTab = page.locator('button:has-text("Books")').first();
    if (await booksTab.count() > 0) {
      await booksTab.click();
      await page.waitForTimeout(500);
    }
    
    // Try to click on Series tab if it exists
    const seriesTab = page.locator('button:has-text("Series")').first();
    if (await seriesTab.count() > 0) {
      await seriesTab.click();
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ 
      path: 'test-results/library-tabs.png',
      fullPage: true 
    });
  });

  test('should test search functionality', async ({ page }) => {
    // Try to find and test search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await searchInput.clear();
    }
    
    await page.screenshot({ 
      path: 'test-results/search-functionality.png',
      fullPage: true 
    });
  });
});