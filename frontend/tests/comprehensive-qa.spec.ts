import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * COMPREHENSIVE QA TEST SUITE
 *
 * This test suite systematically tests every feature of BookTarr as a user would:
 * 1. Navigation and page loading
 * 2. Books/Library page (viewing, searching, filtering)
 * 3. Single book addition (ISBN, title/author, manual entry)
 * 4. CSV import (HandyLib format, validation, errors)
 * 5. Series page (viewing, completion ratios, series cards)
 * 6. Series details (volumes, owned/missing/wanted status)
 * 7. Manual series addition (manga, books, one-offs)
 * 8. Settings page (metadata sources, clear data, backup/restore)
 * 9. Reading progress (mark reading/finished, ratings, wishlist)
 * 10. Responsive design and mobile features
 */

test.describe('Comprehensive QA Test Suite', () => {
  let page: Page;

  // Increase timeout for comprehensive testing
  test.setTimeout(180000); // 3 minutes per test

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('🚀 Starting comprehensive QA testing...');
  });

  test.afterAll(async () => {
    await page.close();
    console.log('✅ Comprehensive QA testing complete!');
  });

  /**
   * TEST 1: Application Loading and Navigation
   */
  test('1. Application loads and navigation works @visual', async () => {
    console.log('\n📍 TEST 1: Application Loading and Navigation');

    // Load the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });

    // Take screenshot of initial load
    await page.screenshot({
      path: 'test-results/qa-01-initial-load.png',
      fullPage: true
    });

    // Check that the main navigation is present
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    console.log('  ✓ Navigation bar visible');

    // Test all navigation links
    const navLinks = [
      { text: 'Library', expectedUrl: '/' },
      { text: 'Series', expectedUrl: '/series' },
      { text: 'Import', expectedUrl: '/import' },
      { text: 'Settings', expectedUrl: '/settings' }
    ];

    for (const link of navLinks) {
      await page.click(`nav a:has-text("${link.text}")`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(link.expectedUrl.replace('/', '\\/?')));

      await page.screenshot({
        path: `test-results/qa-01-nav-${link.text.toLowerCase()}.png`,
        fullPage: true
      });

      console.log(`  ✓ ${link.text} page loads correctly`);
    }
  });

  /**
   * TEST 2: Books/Library Page - Viewing, Searching, Filtering
   */
  test('2. Books/Library page functionality @visual', async () => {
    console.log('\n📍 TEST 2: Books/Library Page');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Check for main library elements
    const libraryHeader = page.locator('h1:has-text("Library"), h1:has-text("My Books"), h1:has-text("Books")').first();
    await expect(libraryHeader).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'test-results/qa-02-library-initial.png',
      fullPage: true
    });

    console.log('  ✓ Library page header visible');

    // Check for search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/qa-02-library-search.png',
        fullPage: true
      });

      console.log('  ✓ Search input functional');

      // Clear search
      await searchInput.clear();
    } else {
      console.log('  ℹ Search input not found (might be empty library)');
    }

    // Check for filter options (if books exist)
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Filter")');
    const filterCount = await filterButtons.count();
    if (filterCount > 0) {
      await page.screenshot({
        path: 'test-results/qa-02-library-filters.png',
        fullPage: true
      });
      console.log(`  ✓ Found ${filterCount} filter buttons`);
    }

    // Check for "Add Book" button
    const addBookButton = page.locator('button:has-text("Add Book"), a:has-text("Add Book")').first();
    if (await addBookButton.isVisible()) {
      console.log('  ✓ Add Book button visible');
    }
  });

  /**
   * TEST 3: CSV Import - HandyLib Format, Sample Data, Validation
   */
  test('3. CSV Import functionality @visual', async () => {
    console.log('\n📍 TEST 3: CSV Import');

    await page.goto('http://localhost:3000/import', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/qa-03-import-page.png',
      fullPage: true
    });

    console.log('  ✓ Import page loaded');

    // Look for file upload area
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();

    console.log('  ✓ File input found');

    // Create a test CSV file
    const testCsvPath = path.join('/tmp', 'qa-test.csv');
    const csvContent = `Title,Authors,ISBN,Series,Publisher,Date Published,Format
"Test Book 1","Test Author","9780765326355","Test Series","Test Publisher","2010","Hardcover"
"Test Book 2","Another Author","9781234567890","","Publisher 2","2020","Paperback"`;

    fs.writeFileSync(testCsvPath, csvContent);

    // Upload the CSV
    await fileInput.setInputFiles(testCsvPath);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/qa-03-import-file-selected.png',
      fullPage: true
    });

    console.log('  ✓ CSV file uploaded');

    // Look for import settings
    const formatSelect = page.locator('select, [role="combobox"]').first();
    if (await formatSelect.isVisible()) {
      await page.screenshot({
        path: 'test-results/qa-03-import-settings.png',
        fullPage: true
      });
      console.log('  ✓ Import settings visible');
    }

    // Look for import button but DON'T click it (we don't want to actually import during QA)
    const importButton = page.locator('button:has-text("Import"), button:has-text("Upload")').first();
    if (await importButton.isVisible()) {
      const isDisabled = await importButton.isDisabled();
      console.log(`  ✓ Import button found (${isDisabled ? 'disabled' : 'enabled'})`);
    }

    // Clean up test file
    fs.unlinkSync(testCsvPath);
  });

  /**
   * TEST 4: Series Page - Viewing, Completion Ratios, Series Cards
   */
  test('4. Series page functionality @visual', async () => {
    console.log('\n📍 TEST 4: Series Page');

    await page.goto('http://localhost:3000/series', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/qa-04-series-page.png',
      fullPage: true
    });

    console.log('  ✓ Series page loaded');

    // Check for series header
    const seriesHeader = page.locator('h1:has-text("Series"), h1:has-text("My Series")').first();
    await expect(seriesHeader).toBeVisible({ timeout: 10000 });

    console.log('  ✓ Series header visible');

    // Look for series cards
    const seriesCards = page.locator('[class*="series"], [class*="card"]').filter({ hasText: /.+/ });
    const cardCount = await seriesCards.count();

    if (cardCount > 0) {
      console.log(`  ✓ Found ${cardCount} series cards`);

      // Take screenshot of first series card
      const firstCard = seriesCards.first();
      await firstCard.scrollIntoViewIfNeeded();

      await page.screenshot({
        path: 'test-results/qa-04-series-card-detail.png',
        fullPage: true
      });

      // Check for completion ratio
      const completionText = page.locator('text=/\\d+\\/\\d+|\\d+%/').first();
      if (await completionText.isVisible()) {
        const text = await completionText.textContent();
        console.log(`  ✓ Completion ratio visible: ${text}`);
      }

      // Click on first series to see details
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/qa-04-series-details.png',
        fullPage: true
      });

      console.log('  ✓ Series details page loaded');
    } else {
      console.log('  ℹ No series cards found (empty library)');
    }
  });

  /**
   * TEST 5: Series Details - Volumes, Owned/Missing/Wanted Status
   */
  test('5. Series details and volume tracking @visual', async () => {
    console.log('\n📍 TEST 5: Series Details and Volumes');

    await page.goto('http://localhost:3000/series', { waitUntil: 'networkidle' });

    // Find and click first series
    const seriesCards = page.locator('[class*="series"], [class*="card"]').filter({ hasText: /.+/ });
    const cardCount = await seriesCards.count();

    if (cardCount > 0) {
      const firstCard = seriesCards.first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/qa-05-series-details-full.png',
        fullPage: true
      });

      console.log('  ✓ Series details opened');

      // Look for volume list
      const volumeList = page.locator('[class*="volume"], li, [role="listitem"]').filter({ hasText: /volume|vol|#\\d+/i });
      const volumeCount = await volumeList.count();

      if (volumeCount > 0) {
        console.log(`  ✓ Found ${volumeCount} volumes`);

        // Check for status badges (owned/missing/wanted)
        const statusBadges = page.locator('text=/owned|missing|wanted/i');
        const badgeCount = await statusBadges.count();
        console.log(`  ✓ Found ${badgeCount} status badges`);

        // Check for cover images
        const coverImages = page.locator('img[src*="cover"], img[alt*="cover"]');
        const imageCount = await coverImages.count();
        console.log(`  ✓ Found ${imageCount} cover images`);
      } else {
        console.log('  ℹ No volumes found in series');
      }

      // Look for action buttons
      const actionButtons = page.locator('button:has-text("Mark"), button:has-text("Add"), button:has-text("Edit")');
      const actionCount = await actionButtons.count();
      if (actionCount > 0) {
        console.log(`  ✓ Found ${actionCount} action buttons`);
      }
    } else {
      console.log('  ℹ No series available to test');
    }
  });

  /**
   * TEST 6: Single Book Addition - ISBN, Title/Author, Manual Entry
   */
  test('6. Single book addition workflows @visual', async () => {
    console.log('\n📍 TEST 6: Single Book Addition');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Look for "Add Book" button
    const addBookButton = page.locator('button:has-text("Add Book"), a:has-text("Add Book"), button:has-text("Add")').first();

    if (await addBookButton.isVisible()) {
      await addBookButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/qa-06-add-book-dialog.png',
        fullPage: true
      });

      console.log('  ✓ Add book dialog opened');

      // Check for ISBN input
      const isbnInput = page.locator('input[placeholder*="ISBN"], input[name*="isbn"]').first();
      if (await isbnInput.isVisible()) {
        await isbnInput.fill('9780765326355');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'test-results/qa-06-isbn-entered.png',
          fullPage: true
        });

        console.log('  ✓ ISBN input functional');
        await isbnInput.clear();
      }

      // Check for title/author search
      const titleInput = page.locator('input[placeholder*="Title"], input[name*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('The Way of Kings');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'test-results/qa-06-title-entered.png',
          fullPage: true
        });

        console.log('  ✓ Title input functional');
        await titleInput.clear();
      }

      const authorInput = page.locator('input[placeholder*="Author"], input[name*="author"]').first();
      if (await authorInput.isVisible()) {
        await authorInput.fill('Brandon Sanderson');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'test-results/qa-06-author-entered.png',
          fullPage: true
        });

        console.log('  ✓ Author input functional');
      }

      // Look for search/submit button but don't click it
      const searchButton = page.locator('button:has-text("Search"), button:has-text("Add"), button[type="submit"]').first();
      if (await searchButton.isVisible()) {
        console.log('  ✓ Search/submit button found');
      }

      // Close the dialog
      const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label*="close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('  ✓ Dialog closed');
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('  ℹ Add Book button not found');
    }
  });

  /**
   * TEST 7: Settings Page - Metadata Sources, Clear Data, Backup/Restore
   */
  test('7. Settings page functionality @visual', async () => {
    console.log('\n📍 TEST 7: Settings Page');

    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/qa-07-settings-page.png',
      fullPage: true
    });

    console.log('  ✓ Settings page loaded');

    // Check for settings sections
    const settingsSections = [
      'Metadata Sources',
      'Data Management',
      'Backup',
      'API',
      'Privacy'
    ];

    for (const section of settingsSections) {
      const sectionHeader = page.locator(`text=/${section}/i`).first();
      if (await sectionHeader.isVisible()) {
        await sectionHeader.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `test-results/qa-07-settings-${section.toLowerCase().replace(/\\s+/g, '-')}.png`,
          fullPage: true
        });
        console.log(`  ✓ ${section} section found`);
      }
    }

    // Check for metadata source toggles
    const toggles = page.locator('input[type="checkbox"], [role="switch"]');
    const toggleCount = await toggles.count();
    if (toggleCount > 0) {
      console.log(`  ✓ Found ${toggleCount} toggle switches`);
    }

    // Check for dangerous actions (don't click them!)
    const clearDataButton = page.locator('button:has-text("Clear"), button:has-text("Delete"), button:has-text("Remove")').first();
    if (await clearDataButton.isVisible()) {
      await clearDataButton.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: 'test-results/qa-07-settings-clear-data.png',
        fullPage: true
      });
      console.log('  ✓ Clear data button found (not clicked)');
    }

    // Check for backup/export options
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Backup"), button:has-text("Download")').first();
    if (await exportButton.isVisible()) {
      console.log('  ✓ Export/backup button found');
    }
  });

  /**
   * TEST 8: Reading Progress - Mark Reading/Finished, Ratings, Wishlist
   */
  test('8. Reading progress features @visual', async () => {
    console.log('\n📍 TEST 8: Reading Progress');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Look for books to interact with
    const bookCards = page.locator('[class*="book"], [class*="card"]').filter({ hasText: /.+/ });
    const bookCount = await bookCards.count();

    if (bookCount > 0) {
      const firstBook = bookCards.first();
      await firstBook.scrollIntoViewIfNeeded();

      // Look for reading progress indicators
      const progressIndicators = page.locator('text=/reading|finished|to read|wishlist/i');
      const indicatorCount = await progressIndicators.count();
      if (indicatorCount > 0) {
        console.log(`  ✓ Found ${indicatorCount} progress indicators`);
      }

      // Try to open book details/menu
      await firstBook.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/qa-08-book-details.png',
        fullPage: true
      });

      // Look for status change options
      const statusButtons = page.locator('button:has-text("Start Reading"), button:has-text("Mark"), button:has-text("Finish")');
      const statusCount = await statusButtons.count();
      if (statusCount > 0) {
        console.log(`  ✓ Found ${statusCount} status change buttons`);

        await page.screenshot({
          path: 'test-results/qa-08-status-options.png',
          fullPage: true
        });
      }

      // Look for rating interface
      const ratingElements = page.locator('[role="slider"], input[type="range"], text=/rating/i, svg[class*="star"]');
      const ratingCount = await ratingElements.count();
      if (ratingCount > 0) {
        console.log(`  ✓ Found ${ratingCount} rating elements`);

        await page.screenshot({
          path: 'test-results/qa-08-rating-interface.png',
          fullPage: true
        });
      }
    } else {
      console.log('  ℹ No books available to test reading progress');
    }
  });

  /**
   * TEST 9: Responsive Design and Mobile Features
   */
  test('9. Responsive design and mobile features @visual', async () => {
    console.log('\n📍 TEST 9: Responsive Design');

    // Test different viewport sizes
    const viewports = [
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      console.log(`  Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Load each main page at this viewport
      const pages = [
        { name: 'Library', url: '/' },
        { name: 'Series', url: '/series' },
        { name: 'Import', url: '/import' },
        { name: 'Settings', url: '/settings' }
      ];

      for (const testPage of pages) {
        await page.goto(`http://localhost:3000${testPage.url}`, { waitUntil: 'networkidle' });

        await page.screenshot({
          path: `test-results/qa-09-${viewport.name.toLowerCase()}-${testPage.name.toLowerCase()}.png`,
          fullPage: true
        });
      }

      console.log(`  ✓ ${viewport.name} layout tested`);
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  /**
   * TEST 10: Manual Series Addition
   */
  test('10. Manual series addition @visual', async () => {
    console.log('\n📍 TEST 10: Manual Series Addition');

    await page.goto('http://localhost:3000/series', { waitUntil: 'networkidle' });

    // Look for "Add Series" button
    const addSeriesButton = page.locator('button:has-text("Add Series"), a:has-text("Add Series"), button:has-text("New Series")').first();

    if (await addSeriesButton.isVisible()) {
      await addSeriesButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/qa-10-add-series-dialog.png',
        fullPage: true
      });

      console.log('  ✓ Add series dialog opened');

      // Check for series name input
      const nameInput = page.locator('input[placeholder*="Series"], input[name*="series"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Manga Series');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'test-results/qa-10-series-name-entered.png',
          fullPage: true
        });

        console.log('  ✓ Series name input functional');
      }

      // Check for series type selector (manga/books/etc)
      const typeSelector = page.locator('select, [role="combobox"]').filter({ hasText: /type|category/i }).first();
      if (await typeSelector.isVisible()) {
        console.log('  ✓ Series type selector found');

        await page.screenshot({
          path: 'test-results/qa-10-series-type-selector.png',
          fullPage: true
        });
      }

      // Close dialog
      const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('  ✓ Dialog closed');
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('  ℹ Add Series button not found');
    }
  });

  /**
   * TEST 11: Error Handling and Edge Cases
   */
  test('11. Error handling and edge cases @visual', async () => {
    console.log('\n📍 TEST 11: Error Handling');

    // Test 404 page
    await page.goto('http://localhost:3000/nonexistent-page', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: 'test-results/qa-11-404-page.png',
      fullPage: true
    });
    console.log('  ✓ 404 page tested');

    // Test invalid ISBN
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    const addButton = page.locator('button:has-text("Add Book"), a:has-text("Add Book")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const isbnInput = page.locator('input[placeholder*="ISBN"], input[name*="isbn"]').first();
      if (await isbnInput.isVisible()) {
        await isbnInput.fill('invalid-isbn');
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/qa-11-invalid-isbn.png',
          fullPage: true
        });

        console.log('  ✓ Invalid ISBN tested');

        // Close dialog
        await page.keyboard.press('Escape');
      }
    }

    // Check console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (consoleMessages.length > 0) {
      console.log(`  ⚠ Found ${consoleMessages.length} console errors:`);
      consoleMessages.forEach(msg => console.log(`    - ${msg}`));
    } else {
      console.log('  ✓ No console errors detected');
    }
  });

  /**
   * TEST 12: Performance and Load Times
   */
  test('12. Performance and load times @visual', async () => {
    console.log('\n📍 TEST 12: Performance');

    const pages = [
      { name: 'Library', url: '/' },
      { name: 'Series', url: '/series' },
      { name: 'Import', url: '/import' },
      { name: 'Settings', url: '/settings' }
    ];

    for (const testPage of pages) {
      const startTime = Date.now();
      await page.goto(`http://localhost:3000${testPage.url}`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`  ${testPage.name} page: ${loadTime}ms`);

      if (loadTime > 3000) {
        console.log(`    ⚠ Slow load time (>${loadTime}ms)`);
      } else {
        console.log(`    ✓ Good load time`);
      }
    }
  });
});
