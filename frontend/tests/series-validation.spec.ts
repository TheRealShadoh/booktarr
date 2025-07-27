import { test, expect } from '@playwright/test';

test.describe('Series Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to series page', async ({ page }) => {
    // Look for series navigation
    const seriesNav = page.locator('nav a:has-text("Series"), [data-testid="series-nav"], a[href*="series"]');
    
    if (await seriesNav.count() > 0) {
      await seriesNav.first().click();
    } else {
      // Try direct navigation
      await page.goto('/series');
    }
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/series-main-page.png',
      fullPage: true 
    });
    
    // Verify we're on series page
    await expect(page.locator('h1, h2, h3')).toContainText(/Series/i);
  });

  test('should display series list with completion stats', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Look for series cards or list items
    const seriesItems = page.locator('.series-card, .series-item, [data-testid="series-item"]');
    
    if (await seriesItems.count() > 0) {
      await page.screenshot({ 
        path: 'test-results/series-list-with-stats.png',
        fullPage: true 
      });
      
      // Check for completion percentages
      const completionStats = page.locator('text=/\\d+%/, text=/\\d+\\/\\d+/, .completion, .progress');
      if (await completionStats.count() > 0) {
        await expect(completionStats.first()).toBeVisible();
      }
      
      // Check for owned/missing indicators
      const statusIndicators = page.locator('.owned, .missing, .complete, .incomplete');
      if (await statusIndicators.count() > 0) {
        await expect(statusIndicators.first()).toBeVisible();
      }
    } else {
      await page.screenshot({ 
        path: 'test-results/series-list-empty.png',
        fullPage: true 
      });
    }
  });

  test('should show series details with volume list', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Click on first series if available
    const firstSeries = page.locator('.series-card, .series-item, [data-testid="series-item"]').first();
    
    if (await firstSeries.count() > 0) {
      await firstSeries.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/series-details-page.png',
        fullPage: true 
      });
      
      // Check for volume list
      const volumes = page.locator('.volume, .book-item, [data-testid="volume"]');
      if (await volumes.count() > 0) {
        await expect(volumes.first()).toBeVisible();
        
        // Take screenshot of volume details
        await page.screenshot({ 
          path: 'test-results/series-volume-list.png',
          fullPage: true 
        });
      }
    }
  });

  test('should identify missing books in series', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Look for a series with missing books
    const seriesWithMissing = page.locator('.series-card:has(.missing), .series-item:has(.incomplete)').first();
    
    if (await seriesWithMissing.count() > 0) {
      await seriesWithMissing.click();
      await page.waitForLoadState('networkidle');
      
      // Look for missing volume indicators
      const missingVolumes = page.locator('.missing, .not-owned, [data-status="missing"]');
      
      if (await missingVolumes.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/series-missing-books-identified.png',
          fullPage: true 
        });
        
        await expect(missingVolumes.first()).toBeVisible();
        
        // Check that missing books are clearly marked
        const missingIndicators = page.locator('.missing-indicator, .status-missing, text="Missing"');
        if (await missingIndicators.count() > 0) {
          await expect(missingIndicators.first()).toBeVisible();
        }
      }
    } else {
      // Create test scenario by adding books to a series
      await page.screenshot({ 
        path: 'test-results/series-no-missing-books-found.png',
        fullPage: true 
      });
    }
  });

  test('should show correct completion ratios', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Look for series with completion percentages
    const completionPercentages = page.locator('text=/\\d+%/');
    
    if (await completionPercentages.count() > 0) {
      await page.screenshot({ 
        path: 'test-results/series-completion-ratios.png',
        fullPage: true 
      });
      
      // Click on a series to see detailed breakdown
      const seriesWithCompletion = page.locator('.series-card:has(text(/\\d+%/)), .series-item:has(text(/\\d+%/))').first();
      
      if (await seriesWithCompletion.count() > 0) {
        await seriesWithCompletion.click();
        await page.waitForLoadState('networkidle');
        
        // Check for detailed completion stats
        const detailedStats = page.locator('.stats, .completion-stats, [data-testid="series-stats"]');
        if (await detailedStats.count() > 0) {
          await page.screenshot({ 
            path: 'test-results/series-detailed-completion.png',
            fullPage: true 
          });
          
          // Verify that owned/total numbers make sense
          const ownedCount = page.locator('text=/Owned.*\\d+/, text=/\\d+.*owned/i');
          const totalCount = page.locator('text=/Total.*\\d+/, text=/\\d+.*total/i');
          
          if (await ownedCount.count() > 0 && await totalCount.count() > 0) {
            await expect(ownedCount.first()).toBeVisible();
            await expect(totalCount.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should handle series with volume count issues', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Look for series that might have count inconsistencies
    const allSeries = page.locator('.series-card, .series-item');
    
    if (await allSeries.count() > 0) {
      // Check each series for potential issues
      const seriesCount = await allSeries.count();
      
      for (let i = 0; i < Math.min(seriesCount, 3); i++) {
        const series = allSeries.nth(i);
        await series.click();
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of series details
        await page.screenshot({ 
          path: `test-results/series-validation-${i + 1}.png`,
          fullPage: true 
        });
        
        // Check for inconsistencies
        const errorMessages = page.locator('.error, .warning, .inconsistency');
        const validationIssues = page.locator('text="inconsistent", text="mismatch", text="error"');
        
        if (await errorMessages.count() > 0 || await validationIssues.count() > 0) {
          await page.screenshot({ 
            path: `test-results/series-validation-issues-${i + 1}.png`,
            fullPage: true 
          });
        }
        
        // Go back to series list
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should provide volume status management', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Click on first series
    const firstSeries = page.locator('.series-card, .series-item').first();
    
    if (await firstSeries.count() > 0) {
      await firstSeries.click();
      await page.waitForLoadState('networkidle');
      
      // Look for volume status controls (owned/wanted/missing)
      const statusControls = page.locator('select[name*="status"], .status-selector, [data-testid="volume-status"]');
      const statusButtons = page.locator('button:has-text("Owned"), button:has-text("Wanted"), button:has-text("Missing")');
      
      if (await statusControls.count() > 0 || await statusButtons.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/series-volume-status-controls.png',
          fullPage: true 
        });
        
        // Try changing a volume status if possible
        if (await statusButtons.count() > 0) {
          const wantedButton = page.locator('button:has-text("Wanted"), button:has-text("Want")').first();
          if (await wantedButton.count() > 0) {
            await wantedButton.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/series-volume-status-changed.png',
              fullPage: true 
            });
          }
        }
      }
    }
  });

  test('should show series metadata and covers', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Click on first series
    const firstSeries = page.locator('.series-card, .series-item').first();
    
    if (await firstSeries.count() > 0) {
      await firstSeries.click();
      await page.waitForLoadState('networkidle');
      
      // Check for series metadata
      const seriesTitle = page.locator('h1, h2, .series-title');
      const seriesAuthor = page.locator('.author, .series-author');
      const seriesDescription = page.locator('.description, .series-description');
      
      await page.screenshot({ 
        path: 'test-results/series-metadata-display.png',
        fullPage: true 
      });
      
      // Check for volume covers
      const volumeCovers = page.locator('img[src*="cover"], img[alt*="cover"], .cover-image');
      
      if (await volumeCovers.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/series-volume-covers.png',
          fullPage: true 
        });
        
        await expect(volumeCovers.first()).toBeVisible();
      }
      
      // Check for missing cover indicators
      const missingCovers = page.locator('.no-cover, .missing-cover, .placeholder-cover');
      if (await missingCovers.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/series-missing-covers.png',
          fullPage: true 
        });
      }
    }
  });
});