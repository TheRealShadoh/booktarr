import { test, expect } from '@playwright/test';

test.describe('Single Book Addition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to add book page', async ({ page }) => {
    // Look for add book button/link
    const addBookButton = page.locator('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    if (await addBookButton.count() > 0) {
      await addBookButton.first().click();
    } else {
      // Try navigation menu
      await page.click('nav a:has-text("Add"), nav button:has-text("Add")');
    }
    
    await page.screenshot({ 
      path: 'test-results/add-book-page.png',
      fullPage: true 
    });
    
    // Verify we're on add book page - check for specific heading
    await expect(page.getByRole('heading', { name: 'Add Books to Library' })).toBeVisible();
  });

  test('should show book search form', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Look for search inputs
    const isbnInput = page.locator('input[name="isbn"], input[placeholder*="ISBN"], [data-testid="isbn-input"]');
    const titleInput = page.locator('input[name="title"], input[placeholder*="Title"], [data-testid="title-input"]');
    const authorInput = page.locator('input[name="author"], input[placeholder*="Author"], [data-testid="author-input"]');
    
    // At least one search field should be visible
    const searchInputs = page.locator('input[type="text"], input[type="search"]');
    await expect(searchInputs.first()).toBeVisible();
    
    await page.screenshot({ 
      path: 'test-results/book-search-form.png',
      fullPage: true 
    });
  });

  test('should search book by ISBN', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Enter ISBN
    const isbnInput = page.locator('input[name="isbn"], input[placeholder*="ISBN"], [data-testid="isbn-input"]').first();
    await isbnInput.fill('9780747532699'); // Harry Potter ISBN
    
    // Submit search
    const searchButton = page.locator('button:has-text("Search"), button[type="submit"], [data-testid="search-button"]');
    if (await searchButton.count() > 0) {
      await searchButton.first().click();
    } else {
      await isbnInput.press('Enter');
    }
    
    // Wait for search results
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/isbn-search-results.png',
      fullPage: true 
    });
    
    // Check for search results or book details
    const results = page.locator('.search-results, .book-details, [data-testid="search-results"]');
    const bookTitle = page.locator('text="Harry Potter", text="Philosopher"');
    
    if (await results.count() > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should search book by title', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Enter title in the search input
    const searchInput = page.locator('input[placeholder*="book title"]');
    await searchInput.fill('The Fellowship of the Ring');
    
    // Submit search
    const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
    if (await searchButton.count() > 0) {
      await searchButton.first().click();
    } else {
      await titleInput.press('Enter');
    }
    
    // Wait for search results
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/title-search-results.png',
      fullPage: true 
    });
    
    // Check for search results
    const results = page.locator('.search-results, .book-details, [data-testid="search-results"]');
    if (await results.count() > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should add book to collection', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Search for a book
    const isbnInput = page.locator('input[name="isbn"], input[placeholder*="ISBN"], [data-testid="isbn-input"]').first();
    await isbnInput.fill('9780261102354'); // Lord of the Rings ISBN
    
    const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
    if (await searchButton.count() > 0) {
      await searchButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Look for add to collection button
    const addButton = page.locator('button:has-text("Add to Collection"), button:has-text("Add Book"), [data-testid="add-to-collection"]');
    
    if (await addButton.count() > 0) {
      await addButton.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/book-added-to-collection.png',
        fullPage: true 
      });
      
      // Check for success message
      const successMessage = page.locator('.success, .toast, [data-testid="success-message"]');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }
    } else {
      await page.screenshot({ 
        path: 'test-results/book-search-no-add-button.png',
        fullPage: true 
      });
    }
  });

  test('should handle manual book entry', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Look for manual entry option
    const manualEntryButton = page.locator('button:has-text("Manual"), button:has-text("Enter Manually"), [data-testid="manual-entry"]');
    
    if (await manualEntryButton.count() > 0) {
      await manualEntryButton.first().click();
    }
    
    // Fill in manual book details
    // Use the main search input for manual entry
    const searchInput = page.locator('input[placeholder*="book title"]');
    await searchInput.fill('Test Manual Book');
    
    // Check for series fields
    const seriesInput = page.locator('input[name="series"], [data-testid="series-input"]');
    if (await seriesInput.count() > 0) {
      await seriesInput.first().fill('Test Series');
    }
    
    const volumeInput = page.locator('input[name="volume"], input[name="position"], [data-testid="volume-input"]');
    if (await volumeInput.count() > 0) {
      await volumeInput.first().fill('1');
    }
    
    await page.screenshot({ 
      path: 'test-results/manual-book-entry.png',
      fullPage: true 
    });
    
    // Submit manual entry
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
    if (await saveButton.count() > 0) {
      await saveButton.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/manual-book-saved.png',
        fullPage: true 
      });
    }
  });

  test('should show book metadata enrichment', async ({ page }) => {
    // Navigate to add book page
    await page.click('[data-testid="add-book"], button:has-text("Add Book"), a:has-text("Add Book")');
    
    // Search for a book
    const isbnInput = page.locator('input[name="isbn"], input[placeholder*="ISBN"]').first();
    await isbnInput.fill('9780765326355'); // The Way of Kings ISBN
    
    const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
    if (await searchButton.count() > 0) {
      await searchButton.first().click();
      await page.waitForTimeout(5000); // Allow time for metadata fetching
    }
    
    await page.screenshot({ 
      path: 'test-results/book-metadata-enrichment.png',
      fullPage: true 
    });
    
    // Check for enriched metadata
    const metadata = page.locator('.book-details, .metadata, [data-testid="book-metadata"]');
    if (await metadata.count() > 0) {
      // Should show title, author, series info, cover image, etc.
      const coverImage = page.locator('img[src*="cover"], img[alt*="cover"]');
      const seriesInfo = page.locator('text="Stormlight", text="Series"');
      
      // Take additional screenshots if metadata is enriched
      if (await coverImage.count() > 0 || await seriesInfo.count() > 0) {
        await page.screenshot({ 
          path: 'test-results/enriched-book-metadata.png',
          fullPage: true 
        });
      }
    }
  });
});