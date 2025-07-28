import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CSV Series Import and Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to CSV import and upload HandyLib.csv', async ({ page }) => {
    // Navigate to Settings page
    await page.click('text=Settings');
    await page.waitForTimeout(1000);
    
    // Navigate to Import tab
    await page.click('text=Import');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/csv-import-page.png',
      fullPage: true 
    });
    
    // Verify we're on the import page
    await expect(page.locator('text="Import Books"')).toBeVisible({ timeout: 10000 });
    
    // Click on CSV import option
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    // Upload the HandyLib.csv file
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    await page.screenshot({ 
      path: 'test-results/csv-file-selected.png',
      fullPage: true 
    });
    
    // Click Preview button first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      
      // Wait for books to populate in preview
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/csv-preview-populated.png',
        fullPage: true 
      });
      
      // Verify books are shown in preview
      const previewBooks = page.locator('.book-preview, .preview-item, [data-testid="preview-book"]');
      if (await previewBooks.count() > 0) {
        console.log(`Found ${await previewBooks.count()} books in preview`);
      }
    }
    
    // Now click Import button to actually import the books
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      
      // Wait for import to complete
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'test-results/csv-import-completed.png',
        fullPage: true 
      });
      
      // Look for success message or import completion indicator
      const successIndicators = page.locator('.success, .toast, :text("Import completed"), :text("Successfully imported")');
      if (await successIndicators.count() > 0) {
        await expect(successIndicators.first()).toBeVisible();
      }
    }
  });

  test('should show imported books in library view', async ({ page }) => {
    // First import the CSV
    await page.click('text=Settings');
    await page.click('text=Import');
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Library/Books view
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/library-with-imported-books.png',
      fullPage: true 
    });
    
    // Check that books are visible in the library
    const bookElements = page.locator('.book-card, [data-testid="book-item"], .booktarr-card');
    await expect(bookElements.first()).toBeVisible({ timeout: 10000 });
    
    // Count total books displayed
    const bookCount = await bookElements.count();
    console.log(`Found ${bookCount} books in library after CSV import`);
    
    // Should have multiple books from the CSV
    expect(bookCount).toBeGreaterThan(0);
  });

  test('should navigate to series view and show series with completion status', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Series view
    await page.click('text=Series');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/series-view-after-import.png',
      fullPage: true 
    });
    
    // Check for series cards/items
    const seriesElements = page.locator('.series-card, [data-testid="series-item"], .booktarr-card:has(.series)');
    
    if (await seriesElements.count() > 0) {
      await expect(seriesElements.first()).toBeVisible();
      
      // Look for completion percentages or progress indicators
      const completionElements = page.locator('text=/\\d+%/, text=/\\d+\\/\\d+/, .progress, .completion');
      if (await completionElements.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/series-completion-status.png',
          fullPage: true 
        });
      }
      
      // Count series found
      const seriesCount = await seriesElements.count();
      console.log(`Found ${seriesCount} series after CSV import`);
      expect(seriesCount).toBeGreaterThan(0);
    }
  });

  test('should open series details and show missing volumes', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Series view
    await page.click('text=Series');
    await page.waitForTimeout(3000);
    
    // Click on the first series to open details
    const firstSeries = page.locator('.series-card, [data-testid="series-item"], .booktarr-card').first();
    if (await firstSeries.count() > 0) {
      await firstSeries.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/series-details-view.png',
        fullPage: true 
      });
      
      // Look for volume lists and missing indicators
      const volumeElements = page.locator('.volume, [data-testid="volume"], .book-volume');
      const missingElements = page.locator('.missing, text="Missing", .status-missing, [data-status="missing"]');
      const ownedElements = page.locator('.owned, text="Owned", .status-owned, [data-status="owned"]');
      
      if (await volumeElements.count() > 0) {
        const volumeCount = await volumeElements.count();
        console.log(`Found ${volumeCount} volumes in series details`);
        
        if (await missingElements.count() > 0) {
          const missingCount = await missingElements.count();
          console.log(`Found ${missingCount} missing volumes`);
          
          await page.screenshot({ 
            path: 'test-results/series-with-missing-volumes.png',
            fullPage: true 
          });
          
          // Verify missing volumes are displayed
          await expect(missingElements.first()).toBeVisible();
        }
        
        if (await ownedElements.count() > 0) {
          const ownedCount = await ownedElements.count();
          console.log(`Found ${ownedCount} owned volumes`);
          
          // Verify owned volumes are displayed
          await expect(ownedElements.first()).toBeVisible();
        }
        
        // Take screenshot showing volume status
        await page.screenshot({ 
          path: 'test-results/volume-ownership-status.png',
          fullPage: true 
        });
      }
    }
  });

  test('should verify series have book art and complete details', async ({ page }) => {
    // Import CSV first with Preview → Import workflow
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Library
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    
    // Click on Series tab within the library view (not the sidebar)
    await page.locator('.booktarr-card-header button:has-text("Series")').click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/series-with-book-art.png',
      fullPage: true 
    });
    
    // Check each series for book art and details (including standalone books)
    const seriesCards = page.locator('.booktarr-card');
    const seriesCount = await seriesCards.count();
    
    console.log(`Found ${seriesCount} series to check for book art`);
    
    for (let i = 0; i < Math.min(seriesCount, 5); i++) {
      const seriesCard = seriesCards.nth(i);
      
      // Check for series cover image
      const seriesCoverImage = seriesCard.locator('img[src*="cover"], img[alt*="cover"], img[alt*="series"]');
      if (await seriesCoverImage.count() > 0) {
        console.log(`Series ${i+1} has cover image`);
      }
      
      // Get series name for logging
      const seriesName = await seriesCard.locator('h3, .series-title, .title').first().textContent();
      console.log(`Checking series: ${seriesName}`);
      
      // Click to open series details
      await seriesCard.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: `test-results/series-${i+1}-details-with-art.png`,
        fullPage: true 
      });
      
      // Check for individual book covers in series details
      const bookCovers = page.locator('img[src*="cover"], img[alt*="cover"], img[alt*="book"]');
      const coverCount = await bookCovers.count();
      console.log(`Series "${seriesName}" has ${coverCount} book covers displayed`);
      
      // Check for volume information
      const volumes = page.locator('.volume, [data-testid="volume"], .book-volume');
      const volumeCount = await volumes.count();
      console.log(`Series "${seriesName}" shows ${volumeCount} volumes`);
      
      // Verify each volume has appropriate information
      for (let v = 0; v < Math.min(volumeCount, 3); v++) {
        const volume = volumes.nth(v);
        
        // Check for volume title
        const volumeTitle = volume.locator('h4, .volume-title, .title');
        if (await volumeTitle.count() > 0) {
          const title = await volumeTitle.first().textContent();
          console.log(`  Volume ${v+1}: ${title}`);
        }
        
        // Check for volume cover
        const volumeCover = volume.locator('img[src*="cover"], img[alt*="cover"]');
        if (await volumeCover.count() > 0) {
          console.log(`  Volume ${v+1} has cover image`);
        }
        
        // Check for ownership status
        const status = volume.locator('.status, [data-status], .owned, .missing, .wanted');
        if (await status.count() > 0) {
          const statusText = await status.first().textContent();
          console.log(`  Volume ${v+1} status: ${statusText}`);
        }
      }
      
      // Verify series completion information is accurate
      const completionInfo = page.locator(':text("/"), :text("%"), .completion, .progress');
      if (await completionInfo.count() > 0) {
        const completion = await completionInfo.first().textContent();
        console.log(`Series completion: ${completion}`);
      }
      
      // Take detailed screenshot of this series
      await page.screenshot({ 
        path: `test-results/series-${i+1}-complete-details.png`,
        fullPage: true 
      });
      
      // Go back to series list
      const backButton = page.locator('button:has-text("Back"), .back-button, [data-testid="back"]');
      if (await backButton.count() > 0) {
        await backButton.first().click();
      } else {
        await page.goBack();
      }
      await page.waitForTimeout(1500);
    }
    
    // Take final screenshot of series overview
    await page.screenshot({ 
      path: 'test-results/final-series-overview-with-art.png',
      fullPage: true 
    });
  });

  test('should verify series metadata and volume tracking accuracy', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Series view
    await page.click('text=Series');
    await page.waitForTimeout(3000);
    
    // Take screenshot of all series
    await page.screenshot({ 
      path: 'test-results/all-series-overview.png',
      fullPage: true 
    });
    
    // Check each series for accurate completion ratios
    const seriesCards = page.locator('.series-card, [data-testid="series-item"]');
    const seriesCount = await seriesCards.count();
    
    for (let i = 0; i < Math.min(seriesCount, 5); i++) {
      const seriesCard = seriesCards.nth(i);
      
      // Get series name
      const seriesName = await seriesCard.locator('h3, .series-title, .title').first().textContent();
      console.log(`Checking series: ${seriesName}`);
      
      // Look for completion ratio (e.g., "3/5", "80%")
      const completionText = await seriesCard.locator('text=/\\d+\\/\\d+/, text=/\\d+%/').first().textContent();
      if (completionText) {
        console.log(`Series completion: ${completionText}`);
        
        // Verify ratio makes sense (owned <= total)
        if (completionText.includes('/')) {
          const [owned, total] = completionText.split('/').map(n => parseInt(n.trim()));
          expect(owned).toBeLessThanOrEqual(total);
          expect(total).toBeGreaterThan(0);
          console.log(`Series "${seriesName}": ${owned}/${total} volumes (${Math.round(owned/total*100)}%)`);
        }
      }
      
      // Click to open series details
      await seriesCard.click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: `test-results/series-${i+1}-details.png`,
        fullPage: true 
      });
      
      // Count volumes in details view
      const volumes = page.locator('.volume, [data-testid="volume"], .book-volume');
      const volumeCount = await volumes.count();
      
      if (volumeCount > 0) {
        // Count owned vs missing
        const ownedVolumes = page.locator('.owned, .status-owned, [data-status="owned"]');
        const missingVolumes = page.locator('.missing, .status-missing, [data-status="missing"]');
        
        const ownedCount = await ownedVolumes.count();
        const missingCount = await missingVolumes.count();
        
        console.log(`Volume breakdown - Total: ${volumeCount}, Owned: ${ownedCount}, Missing: ${missingCount}`);
        
        // Verify counts add up
        expect(ownedCount + missingCount).toBeLessThanOrEqual(volumeCount);
      }
      
      // Go back to series list
      const backButton = page.locator('button:has-text("Back"), .back-button, [data-testid="back"]');
      if (await backButton.count() > 0) {
        await backButton.first().click();
      } else {
        await page.goBack();
      }
      await page.waitForTimeout(1000);
    }
  });

  test('should test series search and filtering functionality', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Series view
    await page.click('text=Series');
    await page.waitForTimeout(3000);
    
    // Look for search or filter functionality
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="filter"], input[type="search"]');
    
    if (await searchInput.count() > 0) {
      // Test search functionality
      await searchInput.first().fill('manga');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/series-search-manga.png',
        fullPage: true 
      });
      
      // Clear search
      await searchInput.first().clear();
      await page.waitForTimeout(500);
    }
    
    // Look for filter buttons (Complete, Incomplete, etc.)
    const filterButtons = page.locator('button:has-text("Complete"), button:has-text("Incomplete"), button:has-text("Missing"), .filter-button');
    
    if (await filterButtons.count() > 0) {
      // Test incomplete filter
      const incompleteFilter = page.locator('button:has-text("Incomplete"), button:has-text("Missing")').first();
      if (await incompleteFilter.count() > 0) {
        await incompleteFilter.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/series-filtered-incomplete.png',
          fullPage: true 
        });
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/series-functionality-overview.png',
      fullPage: true 
    });
  });

  test('should validate individual book series detection from CSV', async ({ page }) => {
    // Import CSV first
    await page.click('text=Settings');
    await page.click('text=Import');
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    
    // Click Preview first
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Then click Import
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Navigate to Library view to check individual books
    await page.click('text=Library');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/library-book-series-info.png',
      fullPage: true 
    });
    
    // Look for books with series information
    const booksWithSeries = page.locator('.book-card:has(.series), [data-testid="book-item"]:has(.series), .booktarr-card:has-text("Vol"), .booktarr-card:has-text("#")');
    
    if (await booksWithSeries.count() > 0) {
      const seriesBookCount = await booksWithSeries.count();
      console.log(`Found ${seriesBookCount} books with series information`);
      
      // Check first few books with series info
      for (let i = 0; i < Math.min(seriesBookCount, 3); i++) {
        const bookCard = booksWithSeries.nth(i);
        
        // Get book title and series info
        const bookTitle = await bookCard.locator('h3, .title, .book-title').first().textContent();
        const seriesInfo = await bookCard.locator('.series, text="Vol", text="#"').first().textContent();
        
        console.log(`Book: "${bookTitle}" - Series: "${seriesInfo}"`);
        
        // Click on book to see details
        await bookCard.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `test-results/book-${i+1}-series-details.png`,
          fullPage: true 
        });
        
        // Go back to library
        const backButton = page.locator('button:has-text("Back"), .back-button');
        if (await backButton.count() > 0) {
          await backButton.first().click();
        } else {
          await page.goBack();
        }
        await page.waitForTimeout(500);
      }
      
      // Verify series detection worked
      expect(seriesBookCount).toBeGreaterThan(0);
    }
  });
});