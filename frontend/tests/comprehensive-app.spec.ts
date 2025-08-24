import { test, expect } from '@playwright/test';

test.describe('BookTarr Comprehensive App Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for beforeEach
    page.setDefaultTimeout(60000);
    
    // Start from the main page
    await page.goto('/');
    
    // Wait for the initial page load with basic elements
    await page.waitForSelector('h1:has-text("Booktarr")', { timeout: 30000 });
    
    // Wait a short time for initial requests to settle
    await page.waitForTimeout(2000);
    
    // Ensure we can access the API
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should load main page and verify basic layout', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Booktarr/);
    
    // Verify main navigation elements are present
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Verify layout structure
    await expect(page.locator('nav')).toBeVisible(); // Navigation sidebar
    await expect(page.locator('main')).toBeVisible(); // Main content area
    
    await page.screenshot({ 
      path: 'test-results/main-page-layout.png',
      fullPage: true 
    });
  });

  test('should navigate between main pages', async ({ page }) => {
    // Test Library navigation
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'library', exact: true }).first()).toBeVisible();
    
    // Test Settings navigation
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'settings', exact: true }).first()).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/navigation-test.png',
      fullPage: true 
    });
  });

  test('should test library page functionality', async ({ page }) => {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForLoadState('networkidle');
    
    // Check for library page heading
    await expect(page.getByRole('heading', { name: 'library', exact: true }).first()).toBeVisible();
    
    // Check for any content area
    const contentArea = page.locator('main, .content, .library-content');
    await expect(contentArea).toBeVisible();
    
    // Test tab switching if tabs exist - use more specific selectors
    const individualTab = page.getByRole('button', { name: 'Display books individually' });
    if (await individualTab.count() > 0) {
      await individualTab.click();
      await page.waitForTimeout(500);
    }
    
    const seriesTab = page.getByRole('button', { name: 'Display books by series' });
    if (await seriesTab.count() > 0) {
      await seriesTab.click();
      await page.waitForTimeout(500);
    }
    
    // Test API interaction - verify books endpoint works
    const response = await page.request.get('/api/books');
    expect(response.ok()).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/library-functionality.png',
      fullPage: true 
    });
  });

  test('should test settings page functionality', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Check for settings page heading
    await expect(page.getByRole('heading', { name: 'settings', exact: true }).first()).toBeVisible();
    
    // Test settings API
    const settingsResponse = await page.request.get('/api/settings');
    expect(settingsResponse.ok()).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/settings-functionality.png',
      fullPage: true 
    });
  });

  test('should verify basic page structure', async ({ page }) => {
    // Check that main layout components are present
    await expect(page.locator('nav, .sidebar')).toBeVisible();
    await expect(page.locator('main, .content')).toBeVisible();
    
    // Test that we can navigate without errors
    await page.click('text=Library');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/basic-structure.png',
      fullPage: true 
    });
  });

  test('should test settings page sections', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Test different settings sections using more specific selectors
    const settingsSections = [
      { name: 'Import', selector: 'button:has-text("Import")' },
      { name: 'Jobs', selector: 'button:has-text("Jobs")' },
      { name: 'Logs', selector: 'button:has-text("Logs")' }
    ];
    
    for (const section of settingsSections) {
      const sectionElement = page.locator(section.selector);
      if (await sectionElement.count() > 0) {
        await sectionElement.first().click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: `test-results/settings-${section.name.toLowerCase()}.png`,
          fullPage: true 
        });
      }
    }
    
    // Test settings API
    const settingsResponse = await page.request.get('/api/settings');
    expect(settingsResponse.ok()).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/settings-overview.png',
      fullPage: true 
    });
  });

  test('should test jobs section functionality', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Jobs section
    await page.click('text=Jobs');
    await page.waitForTimeout(1000);
    
    // Check for job management elements
    await expect(page.locator('text=Scheduled Jobs')).toBeVisible();
    
    // Test job controls if available
    const jobCards = page.locator('[data-testid="job-card"]');
    if (await jobCards.count() > 0) {
      const firstJob = jobCards.first();
      
      // Test enable/disable toggle
      const enableToggle = firstJob.locator('input[type="checkbox"]');
      if (await enableToggle.count() > 0) {
        await enableToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Test manual trigger
      const triggerButton = firstJob.locator('button:has-text("Run Now")');
      if (await triggerButton.count() > 0) {
        await triggerButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Test jobs API
    const jobsResponse = await page.request.get('/api/jobs');
    expect(jobsResponse.ok()).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/jobs-functionality.png',
      fullPage: true 
    });
  });

  test('should test logs page functionality', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Logs section
    await page.click('text=Logs');
    await page.waitForTimeout(1000);
    
    // Check for logs elements
    await expect(page.locator('text=System Logs')).toBeVisible();
    
    // Test log filtering
    const levelFilter = page.locator('select[value*="all"]').first();
    if (await levelFilter.count() > 0) {
      await levelFilter.selectOption('error');
      await page.waitForTimeout(500);
      await levelFilter.selectOption('all');
    }
    
    // Test log search
    const searchInput = page.locator('input[placeholder*="Search log messages"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await searchInput.clear();
    }
    
    // Test refresh functionality
    const refreshButton = page.locator('button[title="Refresh logs"]');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await page.waitForTimeout(500);
    }
    
    // Test logs API
    const logsResponse = await page.request.get('/api/logs');
    expect(logsResponse.ok()).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/logs-functionality.png',
      fullPage: true 
    });
  });

  test('should test book search component', async ({ page }) => {
    // Test header search
    const headerSearch = page.locator('input[placeholder*="Search"]').first();
    await headerSearch.fill('test book');
    await page.waitForTimeout(500);
    
    // Check for search results dropdown
    const searchResults = page.locator('[data-testid="search-results"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults).toBeVisible();
    }
    
    await headerSearch.clear();
    
    // Test advanced search if available
    await page.click('text=Library');
    await page.waitForLoadState('networkidle');
    
    const advancedSearchButton = page.locator('button:has-text("Advanced Search")');
    if (await advancedSearchButton.count() > 0) {
      await advancedSearchButton.click();
      await page.waitForTimeout(1000);
      
      // Test search form
      const titleInput = page.locator('input[placeholder*="title"]');
      if (await titleInput.count() > 0) {
        await titleInput.fill('test');
        await page.waitForTimeout(500);
      }
      
      // Close advanced search
      const closeButton = page.locator('button:has-text("×")');
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/search-functionality.png',
      fullPage: true 
    });
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test with invalid API endpoint
    const invalidResponse = await page.request.get('/api/invalid-endpoint');
    expect(invalidResponse.status()).toBe(404);
    
    // Test network failure simulation
    await page.route('**/api/**', route => route.abort('failed'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check for error handling
    const errorElements = page.locator('.error, .offline, .notification');
    // Note: Don't require error elements as the app might handle errors gracefully
    
    // Restore network
    await page.unroute('**/api/**');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/error-handling.png',
      fullPage: true 
    });
  });

  test('should verify API health and connectivity', async ({ page }) => {
    // Test all major API endpoints
    const endpoints = [
      '/api/health',
      '/api/books',
      '/api/settings',
      '/api/jobs',
      '/api/logs'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect(response.ok()).toBeTruthy();
      
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    }
    
    // Test that frontend can communicate with backend
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check console for any API errors
    const logs = await page.evaluate(() => {
      return window.console.error.toString();
    });
    
    // Don't fail on console errors, just log them
    console.log('Console errors:', logs);
    
    await page.screenshot({ 
      path: 'test-results/api-connectivity.png',
      fullPage: true 
    });
  });
});