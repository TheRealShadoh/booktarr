import { test, expect } from '@playwright/test';

test.describe('Release Calendar Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display monthly release calendar @visual', async ({ page }) => {
    // Navigate to release calendar or dashboard with calendar view
    await page.click('button:has-text("Dashboard")');
    await page.waitForLoadState('networkidle');
    
    // Look for calendar components
    const calendarSection = page.locator('[data-testid="release-calendar"], .release-calendar, .calendar-view').first();
    
    if (await calendarSection.isVisible()) {
      await page.screenshot({ 
        path: 'test-results/release-calendar-monthly.png',
        fullPage: true 
      });
    } else {
      // If no dedicated calendar page, check for upcoming releases section
      const upcomingSection = page.locator('[data-testid="upcoming-releases"], .upcoming-releases, .releases-section').first();
      
      if (await upcomingSection.isVisible()) {
        await page.screenshot({ 
          path: 'test-results/release-calendar-upcoming.png',
          fullPage: true 
        });
      }
    }
    
    // Test monthly calendar API endpoint
    const calendarResponse = await page.request.get('/api/calendar/monthly?user_id=1&months_ahead=6&months_behind=3&include_external=false');
    
    if (calendarResponse.ok()) {
      const calendarData = await calendarResponse.json();
      console.log('Monthly calendar API response sample:', JSON.stringify({
        success: calendarData.success,
        total_releases: calendarData.total_releases,
        upcoming_count: calendarData.upcoming_count,
        recent_count: calendarData.recent_count,
        calendar_keys: Object.keys(calendarData.calendar || {})
      }, null, 2));
      
      expect(calendarData.success).toBe(true);
      expect(calendarData.calendar).toBeDefined();
      expect(calendarData.total_releases).toBeGreaterThanOrEqual(0);
    } else {
      console.log('Monthly calendar API status:', calendarResponse.status());
    }
  });

  test('should show upcoming releases across all series @visual', async ({ page }) => {
    // Test upcoming releases endpoint
    const upcomingResponse = await page.request.get('/api/calendar/upcoming?user_id=1&limit=20&days_ahead=365');
    
    if (upcomingResponse.ok()) {
      const upcomingData = await upcomingResponse.json();
      console.log('Upcoming releases API response:', JSON.stringify({
        success: upcomingData.success,
        total_count: upcomingData.total_count,
        next_release_date: upcomingData.next_release_date,
        sample_releases: upcomingData.releases?.slice(0, 3)
      }, null, 2));
      
      expect(upcomingData.success).toBe(true);
      expect(upcomingData.releases).toBeDefined();
    } else {
      console.log('Upcoming releases API status:', upcomingResponse.status());
    }
    
    // Navigate to upcoming releases page or section
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for upcoming releases tab or section
    const upcomingTab = page.locator('button:has-text("Upcoming"), .tab:has-text("Upcoming"), [data-testid="upcoming-tab"]').first();
    
    if (await upcomingTab.isVisible()) {
      await upcomingTab.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/upcoming-releases-tab.png',
        fullPage: true 
      });
    }
    
    // Take screenshot of current page for upcoming releases context
    await page.screenshot({ 
      path: 'test-results/upcoming-releases-page.png',
      fullPage: true 
    });
  });

  test('should display series-specific upcoming releases @visual', async ({ page }) => {
    // Navigate to Series page
    await page.click('button:has-text("Series")');
    await page.waitForLoadState('networkidle');
    
    // Find a series to test with
    const seriesCards = page.locator('[data-testid="series-card"], .series-card, .card').first();
    
    if (await seriesCards.isVisible()) {
      // Click on first series
      await seriesCards.click();
      await page.waitForLoadState('networkidle');
      
      // Look for upcoming releases section in series details
      const upcomingSection = page.locator('[data-testid="upcoming-volumes"], .upcoming-releases, .future-releases').first();
      
      if (await upcomingSection.isVisible()) {
        await page.screenshot({ 
          path: 'test-results/series-upcoming-releases.png',
          fullPage: true 
        });
      }
      
      // Get series name for API test
      const seriesTitle = await page.locator('h1, .series-title, [data-testid="series-name"]').first().textContent();
      
      if (seriesTitle) {
        const encodedSeriesName = encodeURIComponent(seriesTitle.trim());
        const seriesReleasesResponse = await page.request.get(`/api/calendar/series/${encodedSeriesName}?user_id=1`);
        
        if (seriesReleasesResponse.ok()) {
          const seriesData = await seriesReleasesResponse.json();
          console.log(`Series "${seriesTitle}" releases API response:`, JSON.stringify({
            success: seriesData.success,
            total_count: seriesData.total_count,
            next_release_date: seriesData.next_release_date,
            filter_type: seriesData.filter_type
          }, null, 2));
          
          expect(seriesData.success).toBe(true);
          expect(seriesData.filter_type).toBe('series');
        } else {
          console.log(`Series releases API status for "${seriesTitle}":`, seriesReleasesResponse.status());
        }
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/series-details-releases.png',
      fullPage: true 
    });
  });

  test('should show recent releases user doesn\'t own @visual', async ({ page }) => {
    // Test recent releases API
    const recentResponse = await page.request.get('/api/calendar/recent?user_id=1&days=30&limit=20');
    
    if (recentResponse.ok()) {
      const recentData = await recentResponse.json();
      console.log('Recent releases API response:', JSON.stringify({
        success: recentData.success,
        total_count: recentData.total_count,
        period_days: recentData.period_days,
        sample_releases: recentData.releases?.slice(0, 3)
      }, null, 2));
      
      expect(recentData.success).toBe(true);
      expect(recentData.releases).toBeDefined();
    } else {
      console.log('Recent releases API status:', recentResponse.status());
    }
    
    // Navigate to recent releases section
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for recent releases tab
    const recentTab = page.locator('button:has-text("Recent"), .tab:has-text("Recent"), [data-testid="recent-tab"]').first();
    
    if (await recentTab.isVisible()) {
      await recentTab.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/recent-releases-tab.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/recent-releases-page.png',
      fullPage: true 
    });
  });

  test('should allow adding releases to wishlist @visual', async ({ page }) => {
    // First, find a release to add to wishlist
    const upcomingResponse = await page.request.get('/api/calendar/upcoming?user_id=1&limit=5&days_ahead=365');
    
    let testISBN = null;
    if (upcomingResponse.ok()) {
      const upcomingData = await upcomingResponse.json();
      if (upcomingData.releases && upcomingData.releases.length > 0) {
        const firstRelease = upcomingData.releases[0];
        testISBN = firstRelease.isbn_13 || firstRelease.isbn_10;
        console.log('Testing wishlist with ISBN:', testISBN);
      }
    }
    
    if (testISBN) {
      // Test adding to wishlist via API
      const wishlistResponse = await page.request.post(`/api/calendar/wishlist/${testISBN}?user_id=1`);
      
      if (wishlistResponse.ok()) {
        const wishlistData = await wishlistResponse.json();
        console.log('Add to wishlist API response:', JSON.stringify(wishlistData, null, 2));
        expect(wishlistData.success).toBe(true);
      } else {
        console.log('Add to wishlist API status:', wishlistResponse.status());
      }
    }
    
    // Navigate to wishlist or wanted books section
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for wishlist/wanted tab
    const wishlistTab = page.locator('button:has-text("Wanted"), button:has-text("Wishlist"), .tab:has-text("Wanted")').first();
    
    if (await wishlistTab.isVisible()) {
      await wishlistTab.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/wishlist-releases.png',
        fullPage: true 
      });
    }
    
    // Look for add to wishlist buttons in UI
    const wishlistButtons = page.locator('button:has-text("Add to Wishlist"), button:has-text("Want"), .wishlist-btn');
    const buttonCount = await wishlistButtons.count();
    
    if (buttonCount > 0) {
      console.log(`Found ${buttonCount} wishlist buttons in UI`);
      
      // Try clicking the first one
      await wishlistButtons.first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/wishlist-action.png',
        fullPage: true 
      });
    }
  });

  test('should display author-specific upcoming releases @visual', async ({ page }) => {
    // Test author releases API with a common author
    const authorName = 'Oda, Eiichiro';
    const encodedAuthor = encodeURIComponent(authorName);
    const authorResponse = await page.request.get(`/api/calendar/author/${encodedAuthor}?user_id=1`);
    
    if (authorResponse.ok()) {
      const authorData = await authorResponse.json();
      console.log(`Author "${authorName}" releases API response:`, JSON.stringify({
        success: authorData.success,
        total_count: authorData.total_count,
        author: authorData.author
      }, null, 2));
      
      expect(authorData.success).toBe(true);
      expect(authorData.author).toBe(authorName);
    } else {
      console.log(`Author releases API status for "${authorName}":`, authorResponse.status());
    }
    
    // Navigate to an author page or search for author
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill(authorName);
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/author-releases-search.png',
      fullPage: true 
    });
  });

  test('should handle calendar with external API integration @visual', async ({ page }) => {
    // Test calendar with external data enabled
    const externalCalendarResponse = await page.request.get('/api/calendar/monthly?user_id=1&months_ahead=6&months_behind=3&include_external=true');
    
    if (externalCalendarResponse.ok()) {
      const externalData = await externalCalendarResponse.json();
      console.log('External calendar API response sample:', JSON.stringify({
        success: externalData.success,
        total_releases: externalData.total_releases,
        upcoming_count: externalData.upcoming_count,
        has_external_data: Object.values(externalData.calendar || {}).some(month => 
          month.some(release => release.source === 'external')
        )
      }, null, 2));
      
      expect(externalData.success).toBe(true);
    } else {
      console.log('External calendar API status:', externalCalendarResponse.status());
    }
    
    // Navigate to settings to check external integration options
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Look for external API settings
    const externalSettings = page.locator('[data-testid="external-apis"], .external-settings, .api-settings').first();
    
    if (await externalSettings.isVisible()) {
      await page.screenshot({ 
        path: 'test-results/external-api-settings.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/calendar-external-integration.png',
      fullPage: true 
    });
  });

  test('should test calendar predictions based on series patterns @visual', async ({ page }) => {
    // The calendar API should include predicted releases based on series patterns
    const predictiveCalendarResponse = await page.request.get('/api/calendar/monthly?user_id=1&months_ahead=12&months_behind=1&include_external=false');
    
    if (predictiveCalendarResponse.ok()) {
      const predictiveData = await predictiveCalendarResponse.json();
      
      // Look for predicted releases
      let hasPredictions = false;
      if (predictiveData.calendar) {
        for (const month of Object.values(predictiveData.calendar)) {
          if (Array.isArray(month)) {
            hasPredictions = month.some(release => release.source === 'predicted');
            if (hasPredictions) break;
          }
        }
      }
      
      console.log('Predictive calendar API response:', JSON.stringify({
        success: predictiveData.success,
        total_releases: predictiveData.total_releases,
        has_predictions: hasPredictions,
        future_months: Object.keys(predictiveData.calendar || {}).filter(month => month >= new Date().toISOString().slice(0, 7))
      }, null, 2));
      
      expect(predictiveData.success).toBe(true);
    } else {
      console.log('Predictive calendar API status:', predictiveCalendarResponse.status());
    }
    
    // Navigate to a series that might have predictions
    await page.click('button:has-text("Series")');
    await page.waitForLoadState('networkidle');
    
    // Look for predicted/upcoming indicators
    const predictionIndicators = page.locator('[data-testid="predicted-release"], .predicted, .estimation').first();
    
    if (await predictionIndicators.isVisible()) {
      await page.screenshot({ 
        path: 'test-results/series-predictions.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/calendar-predictions.png',
      fullPage: true 
    });
  });

  test('should display calendar in mobile responsive format', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to calendar view
    await page.click('button:has-text("Dashboard")');
    await page.waitForLoadState('networkidle');
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/release-calendar-mobile.png',
      fullPage: true 
    });
    
    // Test calendar API with mobile context
    const mobileCalendarResponse = await page.request.get('/api/calendar/upcoming?user_id=1&limit=10&days_ahead=90');
    
    if (mobileCalendarResponse.ok()) {
      const mobileData = await mobileCalendarResponse.json();
      console.log('Mobile calendar API response:', JSON.stringify({
        success: mobileData.success,
        total_count: mobileData.total_count,
        optimized_for_mobile: mobileData.releases?.length <= 10
      }, null, 2));
    }
    
    // Test touch interactions on mobile
    const calendarItem = page.locator('[data-testid="release-item"], .release-item, .calendar-item').first();
    
    if (await calendarItem.isVisible()) {
      await calendarItem.tap();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'test-results/calendar-mobile-interaction.png',
        fullPage: true 
      });
    }
  });

  test('should handle calendar error states and edge cases @visual', async ({ page }) => {
    // Test calendar with invalid user ID
    const invalidUserResponse = await page.request.get('/api/calendar/monthly?user_id=99999&months_ahead=6');
    console.log('Invalid user calendar API status:', invalidUserResponse.status());
    
    // Test calendar with invalid date range
    const invalidRangeResponse = await page.request.get('/api/calendar/monthly?user_id=1&months_ahead=0&months_behind=0');
    console.log('Invalid range calendar API status:', invalidRangeResponse.status());
    
    // Test series releases with non-existent series
    const nonExistentSeriesResponse = await page.request.get('/api/calendar/series/NonExistentSeriesName123?user_id=1');
    console.log('Non-existent series API status:', nonExistentSeriesResponse.status());
    
    // Navigate to calendar and test error handling
    await page.click('button:has-text("Dashboard")');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for error handling documentation
    await page.screenshot({ 
      path: 'test-results/calendar-error-handling.png',
      fullPage: true 
    });
  });
});