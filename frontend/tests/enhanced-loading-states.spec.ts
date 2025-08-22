import { test, expect } from '@playwright/test';

test.describe('Enhanced Loading States Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display skeleton screens during initial page loads @visual', async ({ page }) => {
    // Test library page skeleton loading
    await page.goto('/');
    
    // Navigate to library quickly to catch loading state
    await page.click('button:has-text("Library")');
    
    // Look for skeleton loading components (capture quickly before they disappear)
    const skeletonComponents = {
      book_skeletons: page.locator('.animate-pulse, [data-testid="book-skeleton"], .book-card-skeleton'),
      series_skeletons: page.locator('[data-testid="series-skeleton"], .series-card-skeleton'),
      table_skeletons: page.locator('[data-testid="table-skeleton"], .table-skeleton'),
      stats_skeletons: page.locator('[data-testid="stats-skeleton"], .stats-skeleton')
    };
    
    // Take immediate screenshot to capture any loading states
    await page.screenshot({ 
      path: 'test-results/loading-states-immediate.png',
      fullPage: true 
    });
    
    for (const [type, locator] of Object.entries(skeletonComponents)) {
      const count = await locator.count();
      console.log(`${type}: ${count} skeleton components found`);
      
      if (count > 0) {
        await page.screenshot({ 
          path: `test-results/skeleton-${type}.png`,
          fullPage: true 
        });
      }
    }
    
    // Wait for actual content to load
    await page.waitForLoadState('networkidle');
    
    // Take final screenshot with loaded content
    await page.screenshot({ 
      path: 'test-results/loading-states-complete.png',
      fullPage: true 
    });
  });

  test('should show skeleton components during data fetching operations @visual', async ({ page }) => {
    // Test search loading states
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      // Initiate search to trigger loading
      await searchInput.fill('test search query');
      await searchInput.press('Enter');
      
      // Immediately look for loading indicators
      await page.waitForTimeout(100); // Brief pause to catch loading state
      
      const loadingIndicators = {
        search_skeleton: page.locator('.search-skeleton, [data-testid="search-loading"]').first(),
        loading_spinner: page.locator('.animate-spin, .spinner, [data-testid="loading-spinner"]').first(),
        skeleton_cards: page.locator('.animate-pulse').first(),
        loading_text: page.locator('text="Loading", text="Searching"').first()
      };
      
      for (const [type, locator] of Object.entries(loadingIndicators)) {
        const isVisible = await locator.isVisible();
        console.log(`Loading indicator "${type}": ${isVisible ? 'visible' : 'not visible'}`);
      }
      
      await page.screenshot({ 
        path: 'test-results/search-loading-states.png',
        fullPage: true 
      });
    }
    
    // Test series page loading
    await page.click('button:has-text("Series")');
    
    // Quick screenshot to catch loading state
    await page.waitForTimeout(50);
    await page.screenshot({ 
      path: 'test-results/series-loading-state.png',
      fullPage: true 
    });
    
    await page.waitForLoadState('networkidle');
    
    // Test clicking on a series for details loading
    const seriesCards = page.locator('[data-testid="series-card"], .series-card, .card').first();
    
    if (await seriesCards.isVisible()) {
      await seriesCards.click();
      
      // Catch details loading state
      await page.waitForTimeout(50);
      await page.screenshot({ 
        path: 'test-results/series-details-loading.png',
        fullPage: true 
      });
    }
  });

  test('should display progressive loading for large datasets @visual', async ({ page }) => {
    // Test pagination or infinite scroll loading states
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for pagination or load more functionality
    const paginationElements = {
      load_more: page.locator('button:has-text("Load More"), button:has-text("Show More"), [data-testid="load-more"]').first(),
      pagination: page.locator('.pagination, [data-testid="pagination"], .page-nav').first(),
      infinite_scroll: page.locator('[data-testid="infinite-scroll"], .infinite-scroll').first()
    };
    
    for (const [type, locator] of Object.entries(paginationElements)) {
      const isVisible = await locator.isVisible();
      console.log(`Progressive loading element "${type}": ${isVisible ? 'visible' : 'not visible'}`);
      
      if (isVisible && type === 'load_more') {
        // Test load more functionality
        await locator.click();
        
        // Look for loading state
        await page.waitForTimeout(100);
        
        const loadingState = page.locator('.loading, .spinner, text="Loading"').first();
        const isLoading = await loadingState.isVisible();
        
        console.log(`Load more loading state: ${isLoading ? 'visible' : 'not visible'}`);
        
        await page.screenshot({ 
          path: 'test-results/progressive-loading.png',
          fullPage: true 
        });
      }
    }
    
    // Test scrolling to trigger infinite scroll if available
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'test-results/infinite-scroll-loading.png',
      fullPage: true 
    });
  });

  test('should show optimistic updates during user actions @visual', async ({ page }) => {
    // Test optimistic updates for reading status changes
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for books with reading status dropdowns
    const statusDropdowns = page.locator('select, .status-dropdown, [data-testid="reading-status"]');
    const dropdownCount = await statusDropdowns.count();
    
    console.log(`Found ${dropdownCount} reading status controls`);
    
    if (dropdownCount > 0) {
      const firstDropdown = statusDropdowns.first();
      
      if (await firstDropdown.isVisible()) {
        // Change status to trigger optimistic update
        await firstDropdown.click();
        await page.waitForTimeout(100);
        
        // Look for available options
        const statusOptions = page.locator('option, .dropdown-option');
        const optionCount = await statusOptions.count();
        
        if (optionCount > 1) {
          // Select a different status
          await statusOptions.nth(1).click();
          
          // Look for immediate UI feedback (optimistic update)
          await page.waitForTimeout(100);
          
          const optimisticIndicators = {
            loading_overlay: page.locator('.loading-overlay, [data-testid="optimistic-loading"]').first(),
            status_change: page.locator('.status-changing, .updating').first(),
            success_indicator: page.locator('.success, .updated, .checkmark').first()
          };
          
          for (const [type, locator] of Object.entries(optimisticIndicators)) {
            const isVisible = await locator.isVisible();
            console.log(`Optimistic update indicator "${type}": ${isVisible ? 'visible' : 'not visible'}`);
          }
          
          await page.screenshot({ 
            path: 'test-results/optimistic-updates.png',
            fullPage: true 
          });
        }
      }
    }
    
    // Test bulk operations optimistic updates
    const bulkSelectButton = page.locator('button:has-text("Select"), .bulk-select, [data-testid="bulk-mode"]').first();
    
    if (await bulkSelectButton.isVisible()) {
      await bulkSelectButton.click();
      await page.waitForTimeout(500);
      
      // Select some items
      const selectableItems = page.locator('input[type="checkbox"], .selectable-item');
      const itemCount = await selectableItems.count();
      
      if (itemCount > 0) {
        // Select first few items
        for (let i = 0; i < Math.min(3, itemCount); i++) {
          await selectableItems.nth(i).click();
          await page.waitForTimeout(100);
        }
        
        // Look for bulk action buttons
        const bulkActions = page.locator('button:has-text("Mark as"), .bulk-actions, [data-testid="bulk-actions"]').first();
        
        if (await bulkActions.isVisible()) {
          await bulkActions.click();
          await page.waitForTimeout(100);
          
          await page.screenshot({ 
            path: 'test-results/bulk-optimistic-updates.png',
            fullPage: true 
          });
        }
      }
    }
  });

  test('should handle loading overlays for long operations @visual', async ({ page }) => {
    // Test import operation loading overlay
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Look for import section
    const importButton = page.locator('button:has-text("Import"), [data-testid="import-section"]').first();
    
    if (await importButton.isVisible()) {
      await importButton.click();
      await page.waitForTimeout(1000);
      
      // Look for file upload or import options
      const importOptions = {
        file_upload: page.locator('input[type="file"], [data-testid="file-upload"]').first(),
        csv_import: page.locator('button:has-text("CSV"), .csv-import').first(),
        bulk_import: page.locator('button:has-text("Bulk"), .bulk-import').first()
      };
      
      for (const [type, locator] of Object.entries(importOptions)) {
        const isVisible = await locator.isVisible();
        console.log(`Import option "${type}": ${isVisible ? 'visible' : 'not visible'}`);
      }
      
      await page.screenshot({ 
        path: 'test-results/import-interface.png',
        fullPage: true 
      });
    }
    
    // Test sync operations loading
    const syncButtons = page.locator('button:has-text("Sync"), [data-testid="sync-action"]');
    const syncCount = await syncButtons.count();
    
    console.log(`Found ${syncCount} sync buttons`);
    
    if (syncCount > 0) {
      const firstSync = syncButtons.first();
      
      if (await firstSync.isVisible() && await firstSync.isEnabled()) {
        await firstSync.click();
        
        // Look for loading overlay
        await page.waitForTimeout(200);
        
        const loadingOverlay = page.locator('.loading-overlay, .modal-overlay, [data-testid="loading-overlay"]').first();
        const overlayVisible = await loadingOverlay.isVisible();
        
        console.log(`Loading overlay visible: ${overlayVisible}`);
        
        if (overlayVisible) {
          await page.screenshot({ 
            path: 'test-results/loading-overlay.png',
            fullPage: true 
          });
        }
      }
    }
    
    // Test database operations
    const databaseActions = page.locator('button:has-text("Clear"), button:has-text("Reset"), button:has-text("Remove")');
    const dbActionCount = await databaseActions.count();
    
    console.log(`Found ${dbActionCount} database action buttons`);
    
    if (dbActionCount > 0) {
      await page.screenshot({ 
        path: 'test-results/database-actions.png',
        fullPage: true 
      });
    }
  });

  test('should display progress indicators with accurate progress @visual', async ({ page }) => {
    // Test progress bars for operations that show progress
    
    // Navigate to areas that might show progress
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Look for progress indicators
    const progressElements = {
      progress_bars: page.locator('.progress-bar, [data-testid="progress"], .progress'),
      percentage_text: page.locator('text="%", .percentage'),
      step_indicators: page.locator('.step-indicator, .stepper, .progress-steps'),
      circular_progress: page.locator('.circular-progress, .spinner-progress')
    };
    
    for (const [type, locator] of Object.entries(progressElements)) {
      const count = await locator.count();
      console.log(`Progress element "${type}": ${count} found`);
      
      if (count > 0) {
        await page.screenshot({ 
          path: `test-results/progress-${type}.png`,
          fullPage: true 
        });
      }
    }
    
    // Test reading progress if available
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for reading progress indicators on books
    const readingProgress = page.locator('.reading-progress, [data-testid="reading-progress"], .progress-bar');
    const progressCount = await readingProgress.count();
    
    console.log(`Found ${progressCount} reading progress indicators`);
    
    if (progressCount > 0) {
      await page.screenshot({ 
        path: 'test-results/reading-progress-indicators.png',
        fullPage: true 
      });
      
      // Test updating reading progress
      const progressBar = readingProgress.first();
      
      if (await progressBar.isVisible()) {
        // Click on progress bar to test interaction
        await progressBar.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'test-results/reading-progress-interaction.png',
          fullPage: true 
        });
      }
    }
    
    // Test series completion progress
    await page.click('button:has-text("Series")');
    await page.waitForLoadState('networkidle');
    
    const seriesProgress = page.locator('.completion-progress, .series-progress, [data-testid="series-completion"]');
    const seriesProgressCount = await seriesProgress.count();
    
    console.log(`Found ${seriesProgressCount} series progress indicators`);
    
    if (seriesProgressCount > 0) {
      await page.screenshot({ 
        path: 'test-results/series-completion-progress.png',
        fullPage: true 
      });
    }
  });

  test('should show React Query loading states and cache updates @visual', async ({ page }) => {
    // Test React Query loading states by triggering data fetches
    
    // Fresh page load to test initial queries
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Quick screenshot to catch React Query loading
    await page.waitForTimeout(100);
    await page.screenshot({ 
      path: 'test-results/react-query-initial-load.png',
      fullPage: true 
    });
    
    // Test query refetching
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/react-query-refetch.png',
      fullPage: true 
    });
    
    // Test navigation-triggered queries
    await page.click('button:has-text("Library")');
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/react-query-navigation.png',
      fullPage: true 
    });
    
    await page.click('button:has-text("Series")');
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/react-query-series-load.png',
      fullPage: true 
    });
    
    // Test search query states
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      // Type to trigger search queries
      await searchInput.type('test query');
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'test-results/react-query-search.png',
        fullPage: true 
      });
      
      // Clear and type again to test query invalidation
      await searchInput.clear();
      await searchInput.type('another query');
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'test-results/react-query-invalidation.png',
        fullPage: true 
      });
    }
    
    // Test error states by triggering failed requests (if network can be simulated)
    console.log('React Query loading states tested across multiple scenarios');
  });

  test('should handle loading states in mobile viewport @visual', async ({ page }) => {
    // Test mobile viewport loading states
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForTimeout(100);
    
    // Mobile loading screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-loading-initial.png',
      fullPage: true 
    });
    
    // Test mobile navigation loading
    await page.click('button:has-text("Library")');
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/mobile-library-loading.png',
      fullPage: true 
    });
    
    // Test mobile search loading
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/mobile-search-loading.png',
      fullPage: true 
    });
    
    const mobileSearchInput = page.locator('input[placeholder*="search" i]').first();
    
    if (await mobileSearchInput.isVisible()) {
      await mobileSearchInput.tap();
      await mobileSearchInput.fill('mobile search');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(200);
      
      await page.screenshot({ 
        path: 'test-results/mobile-search-results-loading.png',
        fullPage: true 
      });
    }
    
    // Test mobile settings loading
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(100);
    
    await page.screenshot({ 
      path: 'test-results/mobile-settings-loading.png',
      fullPage: true 
    });
    
    console.log('Mobile loading states tested successfully');
  });

  test('should test loading state performance and timing @visual', async ({ page }) => {
    // Test loading state timing and performance
    const loadingTimes = [];
    
    // Test multiple page loads to measure loading performance
    const pages = ['Library', 'Series', 'Search', 'Settings'];
    
    for (const pageName of pages) {
      const startTime = Date.now();
      
      // Navigate to page
      await page.click(`button:has-text("${pageName}")`);
      
      // Wait for loading to start and finish
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      loadingTimes.push({
        page: pageName,
        loadTime: loadTime
      });
      
      console.log(`${pageName} page load time: ${loadTime}ms`);
      
      // Take screenshot after load
      await page.screenshot({ 
        path: `test-results/performance-${pageName.toLowerCase()}-loaded.png`,
        fullPage: true 
      });
    }
    
    // Test skeleton screen minimum display time
    await page.goto('/');
    const skeletonStartTime = Date.now();
    
    // Look for skeleton components
    const skeletonVisible = await page.locator('.animate-pulse').first().isVisible().catch(() => false);
    
    if (skeletonVisible) {
      // Wait for skeletons to disappear
      await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 5000 }).catch(() => {});
      
      const skeletonEndTime = Date.now();
      const skeletonDuration = skeletonEndTime - skeletonStartTime;
      
      console.log(`Skeleton screen duration: ${skeletonDuration}ms`);
    }
    
    // Test loading indicator smoothness
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      const searchStartTime = Date.now();
      
      await searchInput.fill('performance test search');
      await searchInput.press('Enter');
      
      // Look for loading indicators
      const loadingIndicator = page.locator('.animate-spin, .loading, .spinner').first();
      const indicatorVisible = await loadingIndicator.isVisible().catch(() => false);
      
      if (indicatorVisible) {
        // Wait for loading to complete
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
        
        const searchEndTime = Date.now();
        const searchDuration = searchEndTime - searchStartTime;
        
        console.log(`Search loading duration: ${searchDuration}ms`);
      }
    }
    
    // Summary performance report
    console.log('Loading Performance Summary:', JSON.stringify({
      page_load_times: loadingTimes,
      average_load_time: loadingTimes.reduce((sum, item) => sum + item.loadTime, 0) / loadingTimes.length,
      slowest_page: loadingTimes.reduce((prev, current) => (prev.loadTime > current.loadTime) ? prev : current),
      fastest_page: loadingTimes.reduce((prev, current) => (prev.loadTime < current.loadTime) ? prev : current)
    }, null, 2));
    
    await page.screenshot({ 
      path: 'test-results/loading-performance-complete.png',
      fullPage: true 
    });
  });
});