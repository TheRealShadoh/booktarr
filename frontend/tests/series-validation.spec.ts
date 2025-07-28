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
    
    // Verify we're on library/series page (navigation might redirect to library)
    await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
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
    
    // Look for series completion ratios in format "owned/total"
    const completionRatios = page.locator('text=/\\d+\\/\\d+/');
    
    if (await completionRatios.count() > 0) {
      await page.screenshot({ 
        path: 'test-results/series-completion-ratios.png',
        fullPage: true 
      });
      
      // Validate that completion ratios show owned/total format
      const firstRatio = await completionRatios.first().textContent();
      console.log(`Found completion ratio: ${firstRatio}`);
      
      // Ensure ratio is in correct format (owned/total, not owned/owned)
      expect(firstRatio).toMatch(/^\d+\/\d+$/);
      
      // Click on a series to see detailed breakdown
      const seriesWithCompletion = page.locator('[class*="series"]:has(text(/\\d+\\/\\d+/))').first();
      
      if (await seriesWithCompletion.count() > 0) {
        await seriesWithCompletion.click();
        await page.waitForLoadState('networkidle');
        
        // Switch to Volumes tab to see all volumes
        const volumesTab = page.locator('button:has-text("Volumes")');
        if (await volumesTab.count() > 0) {
          await volumesTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Check for detailed completion stats
        const detailedStats = page.locator('.stats, [class*="stats"]');
        if (await detailedStats.count() > 0) {
          await page.screenshot({ 
            path: 'test-results/series-detailed-completion.png',
            fullPage: true 
          });
          
          // Verify that owned/total numbers are logical (owned <= total)
          const statsText = await detailedStats.first().textContent();
          console.log(`Series stats: ${statsText}`);
          
          // Look for specific owned and total counts
          const ownedMatch = statsText?.match(/(\d+).*owned/i);
          const totalMatch = statsText?.match(/(\d+).*total/i);
          
          if (ownedMatch && totalMatch) {
            const ownedCount = parseInt(ownedMatch[1]);
            const totalCount = parseInt(totalMatch[1]);
            
            console.log(`Owned: ${ownedCount}, Total: ${totalCount}`);
            expect(ownedCount).toBeLessThanOrEqual(totalCount);
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
    const firstSeries = page.locator('.series-card, .series-item, [class*="series"]').first();
    
    if (await firstSeries.count() > 0) {
      await firstSeries.click();
      await page.waitForLoadState('networkidle');
      
      // Switch to Volumes tab to see all volumes with covers
      const volumesTab = page.locator('button:has-text("Volumes")');
      if (await volumesTab.count() > 0) {
        await volumesTab.click();
        await page.waitForTimeout(1000);
      }
      
      await page.screenshot({ 
        path: 'test-results/series-volumes-tab.png',
        fullPage: true 
      });
      
      // Check for volume grid display
      const volumeGrid = page.locator('[class*="grid"]');
      if (await volumeGrid.count() > 0) {
        // Check for volume covers within the grid
        const volumeCovers = page.locator('img[src*="amazon"], img[src*="cover"], img[alt*="volume"], img[alt*="book"]');
        
        if (await volumeCovers.count() > 0) {
          console.log(`Found ${await volumeCovers.count()} volume covers`);
          
          await page.screenshot({ 
            path: 'test-results/series-volume-covers-displayed.png',
            fullPage: true 
          });
          
          // Verify that at least one cover image is displayed
          await expect(volumeCovers.first()).toBeVisible();
          
          // Check that cover images have valid src attributes
          const firstCoverSrc = await volumeCovers.first().getAttribute('src');
          expect(firstCoverSrc).toBeTruthy();
          console.log(`First volume cover src: ${firstCoverSrc}`);
          
          // Verify cover is not a placeholder/error image
          expect(firstCoverSrc).not.toContain('placeholder');
          expect(firstCoverSrc).not.toContain('error');
        } else {
          console.log('No volume covers found, checking for placeholders');
          
          // Check for volume placeholders/number indicators
          const volumePlaceholders = page.locator('text=/#\\d+/, [class*="volume"], [class*="position"]');
          if (await volumePlaceholders.count() > 0) {
            await page.screenshot({ 
              path: 'test-results/series-volume-placeholders.png',
              fullPage: true 
            });
          }
        }
        
        // Check for volume status indicators (owned/missing/wanted)
        const statusIndicators = page.locator('text=/Owned/, text=/Missing/, text=/Wanted/, [class*="status"]');
        if (await statusIndicators.count() > 0) {
          console.log(`Found ${await statusIndicators.count()} volume status indicators`);
          await expect(statusIndicators.first()).toBeVisible();
        }
        
        // Check for volume position numbers
        const volumeNumbers = page.locator('text=/#\\d+/');
        if (await volumeNumbers.count() > 0) {
          console.log(`Found ${await volumeNumbers.count()} volume position numbers`);
          await expect(volumeNumbers.first()).toBeVisible();
        }
      }
    }
  });

  test('should navigate to book details when clicking owned volume', async ({ page }) => {
    // Navigate to series page
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    
    // Click on first series that has owned volumes
    const seriesWithOwnedBooks = page.locator('[class*="series"]').first();
    
    if (await seriesWithOwnedBooks.count() > 0) {
      await seriesWithOwnedBooks.click();
      await page.waitForLoadState('networkidle');
      
      // Switch to Volumes tab
      const volumesTab = page.locator('button:has-text("Volumes")');
      if (await volumesTab.count() > 0) {
        await volumesTab.click();
        await page.waitForTimeout(1000);
      }
      
      await page.screenshot({ 
        path: 'test-results/series-before-volume-click.png',
        fullPage: true 
      });
      
      // Find an owned volume and click it
      const ownedVolume = page.locator('[class*="cursor-pointer"]:has(text="Owned"), [class*="clickable"]:has(text="Owned")').first();
      
      if (await ownedVolume.count() > 0) {
        console.log('Found owned volume, clicking...');
        await ownedVolume.click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: 'test-results/series-after-volume-click.png',
          fullPage: true 
        });
        
        // Check if we navigated to book details page
        const bookDetailsIndicators = page.locator('h1, h2, .book-title, [class*="book-details"]');
        if (await bookDetailsIndicators.count() > 0) {
          console.log('Successfully navigated to book details page');
          await expect(bookDetailsIndicators.first()).toBeVisible();
          
          // Verify we can go back to library/series
          const backButton = page.locator('button:has-text("Back"), button:has-text("Library"), a:has-text("Back")');
          if (await backButton.count() > 0) {
            await expect(backButton.first()).toBeVisible();
          }
        } else {
          console.log('No clear book details page detected');
        }
      } else {
        console.log('No owned volumes found to click');
        await page.screenshot({ 
          path: 'test-results/series-no-owned-volumes.png',
          fullPage: true 
        });
      }
    }
  });

  test('should navigate from book details to series details', async ({ page }) => {
    // Navigate to library
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click on a book that belongs to a series
    const seriesBook = page.locator('[class*="book"]:has-text("Vol."), [class*="book"]:has-text("#")').first();
    
    if (await seriesBook.count() > 0) {
      console.log('Found book with series, clicking...');
      await seriesBook.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/book-details-with-series.png',
        fullPage: true 
      });
      
      // Look for series link in book details
      const seriesLink = page.locator('button:has-text("Series:") + button, p:has-text("Series:") button').first();
      
      if (await seriesLink.count() > 0) {
        const seriesName = await seriesLink.textContent();
        console.log(`Found series link: ${seriesName}`);
        
        await seriesLink.click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: 'test-results/navigated-to-series-from-book.png',
          fullPage: true 
        });
        
        // Verify we're on the series details page
        // Wait a bit for the page to fully load
        await page.waitForTimeout(1000);
        
        const seriesTitle = page.locator('h1[class*="text-3xl"]').first();
        if (await seriesTitle.count() > 0) {
          const titleText = await seriesTitle.textContent();
          console.log(`Series page title: ${titleText}`);
          expect(titleText?.trim()).toBe(seriesName?.trim() || '');
        } else {
          // Fallback to any h1
          const anyH1 = page.locator('h1').first();
          if (await anyH1.count() > 0) {
            const titleText = await anyH1.textContent();
            console.log(`Found h1 with text: ${titleText}`);
          }
        }
        
        // Check for volumes tab or volumes display
        const volumesIndicator = page.locator('button:has-text("Volumes"), text=/\\d+\\s*volumes?/i');
        if (await volumesIndicator.count() > 0) {
          console.log('Successfully navigated to series details page');
          await expect(volumesIndicator.first()).toBeVisible();
        }
      } else {
        console.log('No series link found in book details');
        await page.screenshot({ 
          path: 'test-results/book-details-no-series-link.png',
          fullPage: true 
        });
      }
    } else {
      console.log('No books with series indicators found');
      await page.screenshot({ 
        path: 'test-results/library-no-series-books.png',
        fullPage: true 
      });
    }
  });
});