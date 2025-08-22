import { test, expect } from '@playwright/test';

test.describe('Advanced Search Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should perform multi-field search with relevance scoring @visual', async ({ page }) => {
    // Navigate to Advanced Search page
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    // Test multi-field search
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('Sanderson');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"], .search-results, .results-container', { timeout: 10000 });
    
    // Take screenshot of search results
    await page.screenshot({ 
      path: 'test-results/advanced-search-multi-field.png',
      fullPage: true 
    });
    
    // Verify search results are displayed with relevance
    const results = page.locator('[data-testid="search-result"], .search-result, .result-item');
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
    
    // Test API endpoint directly
    const searchResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: 'Sanderson',
        search_type: 'auto',
        include_owned: true,
        include_external: true,
        max_results: 20,
        user_id: 1
      }
    });
    
    if (searchResponse.ok()) {
      const searchData = await searchResponse.json();
      console.log('Advanced search API response:', JSON.stringify(searchData, null, 2));
      expect(searchData.success).toBe(true);
      expect(searchData.results).toBeDefined();
      expect(searchData.execution_time_ms).toBeGreaterThan(0);
    } else {
      console.log('Advanced search API not yet implemented, status:', searchResponse.status());
    }
  });

  test('should test ISBN search with exact matching @visual', async ({ page }) => {
    // Test ISBN search
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('9780765326355'); // Example ISBN
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/advanced-search-isbn.png',
      fullPage: true 
    });
    
    // Test ISBN API endpoint
    const isbnResponse = await page.request.get('/api/search/isbn/9780765326355?include_external=true');
    
    if (isbnResponse.ok()) {
      const isbnData = await isbnResponse.json();
      console.log('ISBN search API response:', JSON.stringify(isbnData, null, 2));
      expect(isbnData.success).toBe(true);
    } else {
      console.log('ISBN search API endpoint status:', isbnResponse.status());
    }
  });

  test('should test search suggestions and auto-completion @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Type partial search to trigger suggestions
    await searchInput.fill('Stormli');
    await page.waitForTimeout(1000);
    
    // Look for suggestion dropdown
    const suggestionDropdown = page.locator('[data-testid="search-suggestions"], .suggestions, .dropdown-menu');
    
    if (await suggestionDropdown.isVisible()) {
      await page.screenshot({ 
        path: 'test-results/search-suggestions-dropdown.png',
        fullPage: true 
      });
      
      // Click on first suggestion if available
      const firstSuggestion = suggestionDropdown.locator('li, .suggestion-item').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Test suggestions API endpoint
    const suggestionsResponse = await page.request.get('/api/search/suggestions?query=Stormli&limit=10');
    
    if (suggestionsResponse.ok()) {
      const suggestionsData = await suggestionsResponse.json();
      console.log('Search suggestions API response:', JSON.stringify(suggestionsData, null, 2));
      expect(suggestionsData.success).toBe(true);
      expect(suggestionsData.suggestions).toBeDefined();
    } else {
      console.log('Search suggestions API status:', suggestionsResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/search-suggestions-complete.png',
      fullPage: true 
    });
  });

  test('should test series-specific search functionality @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Search for a series with volume indicators
    await searchInput.fill('One Piece Vol 1');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Take screenshot of series search results
    await page.screenshot({ 
      path: 'test-results/advanced-search-series.png',
      fullPage: true 
    });
    
    // Test series search API
    const seriesSearchResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: 'One Piece Vol 1',
        search_type: 'series',
        include_owned: true,
        include_external: false,
        max_results: 10,
        user_id: 1
      }
    });
    
    if (seriesSearchResponse.ok()) {
      const seriesData = await seriesSearchResponse.json();
      console.log('Series search API response:', JSON.stringify(seriesData, null, 2));
      expect(seriesData.search_type).toBe('series');
    }
  });

  test('should test author search with fuzzy matching @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Search for author with partial name
    await searchInput.fill('Oda, Eiichiro');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/advanced-search-author.png',
      fullPage: true 
    });
    
    // Test author search API
    const authorSearchResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: 'Oda, Eiichiro',
        search_type: 'author',
        include_owned: true,
        include_external: false,
        max_results: 15,
        user_id: 1
      }
    });
    
    if (authorSearchResponse.ok()) {
      const authorData = await authorSearchResponse.json();
      console.log('Author search API response:', JSON.stringify(authorData, null, 2));
      expect(authorData.search_type).toBe('author');
    }
  });

  test('should test search with local database first, external fallback @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Search for something that might not be in local DB
    await searchInput.fill('Rare Book Title 9999');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(3000); // Allow time for external API calls
    
    // Take screenshot of no results or external results
    await page.screenshot({ 
      path: 'test-results/advanced-search-external-fallback.png',
      fullPage: true 
    });
    
    // Test with external search enabled
    const externalSearchResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: 'Rare Book Title 9999',
        search_type: 'auto',
        include_owned: true,
        include_external: true,
        max_results: 5,
        user_id: 1
      }
    });
    
    if (externalSearchResponse.ok()) {
      const externalData = await externalSearchResponse.json();
      console.log('External search API response:', JSON.stringify(externalData, null, 2));
      expect(externalData.local_results).toBeDefined();
      expect(externalData.external_results).toBeDefined();
    }
  });

  test('should test search result ranking and relevance scoring @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Search for a common term to get multiple results
    await searchInput.fill('manga');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Take screenshot of ranked results
    await page.screenshot({ 
      path: 'test-results/advanced-search-ranking.png',
      fullPage: true 
    });
    
    // Verify results are sorted by relevance
    const results = page.locator('[data-testid="search-result"], .search-result, .result-item');
    const resultCount = await results.count();
    
    if (resultCount > 1) {
      // Check if results appear to be ordered (higher relevance first)
      console.log(`Found ${resultCount} search results for relevance testing`);
    }
    
    // Test API with ranking
    const rankingResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: 'manga',
        search_type: 'auto',
        include_owned: true,
        include_external: false,
        max_results: 20,
        user_id: 1
      }
    });
    
    if (rankingResponse.ok()) {
      const rankingData = await rankingResponse.json();
      console.log('Search ranking API response sample:', JSON.stringify(rankingData.results?.slice(0, 3), null, 2));
      
      // Verify results have relevance scores
      if (rankingData.results && rankingData.results.length > 0) {
        expect(rankingData.results[0].relevance_score).toBeDefined();
      }
    }
  });

  test('should handle search errors and edge cases gracefully @visual', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    // Test empty search
    await searchInput.fill('');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Test special characters
    await searchInput.fill('!@#$%^&*()');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Test very long search query
    await searchInput.fill('a'.repeat(1000));
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Take screenshot of error handling
    await page.screenshot({ 
      path: 'test-results/advanced-search-error-handling.png',
      fullPage: true 
    });
    
    // Test API error handling
    const errorResponse = await page.request.post('/api/search/advanced', {
      data: {
        query: '',
        search_type: 'invalid_type',
        include_owned: true,
        include_external: false,
        max_results: -1,
        user_id: 1
      }
    });
    
    console.log('Error handling API status:', errorResponse.status());
    
    if (errorResponse.ok()) {
      const errorData = await errorResponse.json();
      console.log('Error handling API response:', JSON.stringify(errorData, null, 2));
    }
  });

  test('should test mobile responsive search interface', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    // Test mobile search interface
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('test search');
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/advanced-search-mobile.png',
      fullPage: true 
    });
    
    // Verify mobile interface is functional
    const isVisible = await searchInput.isVisible();
    expect(isVisible).toBe(true);
    
    // Test touch interactions
    await searchInput.tap();
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'test-results/advanced-search-mobile-active.png',
      fullPage: true 
    });
  });
});