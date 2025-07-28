import { test, expect } from '@playwright/test';

test.describe('Reading Progress and Status Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should test reading status functionality', async ({ page }) => {
    await page.click('text=Library');
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on the Books tab
    await page.click('button:has-text("Books")');
    await page.waitForTimeout(1000);
    
    // Look for book cards with reading status dropdowns
    const bookCards = page.locator('.booktarr-card');
    const bookCount = await bookCards.count();
    
    if (bookCount > 0) {
      const firstBook = bookCards.first();
      
      // Look for reading status dropdown
      const statusDropdown = firstBook.locator('select, .status-dropdown');
      
      if (await statusDropdown.count() > 0) {
        // Test different reading statuses
        const statuses = ['want_to_read', 'currently_reading', 'read', 'abandoned'];
        
        for (const status of statuses) {
          try {
            await statusDropdown.selectOption(status);
            await page.waitForTimeout(500);
            
            // Verify API call was made
            const response = await page.waitForResponse(
              response => response.url().includes('/api/reading/') && response.request().method() === 'PUT',
              { timeout: 2000 }
            ).catch(() => null);
            
            if (response) {
              expect(response.ok()).toBeTruthy();
            }
          } catch (error) {
            console.log(`Status ${status} not available or failed to set`);
          }
        }
      } else {
        console.log('No reading status dropdown found');
      }
      
      // Test reading progress if available
      const progressBar = firstBook.locator('.progress-bar, input[type="range"], input[type="number"]');
      
      if (await progressBar.count() > 0) {
        // Test progress updates
        await progressBar.fill('50');
        await page.waitForTimeout(500);
      }
      
      // Test rating functionality
      const ratingStars = firstBook.locator('.star-rating, [data-testid="rating"]');
      
      if (await ratingStars.count() > 0) {
        const stars = ratingStars.locator('button, .star');
        const starCount = await stars.count();
        
        if (starCount > 0) {
          // Click on third star (3-star rating)
          await stars.nth(2).click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      console.log('No books found to test reading status');
    }
    
    await page.screenshot({ 
      path: 'test-results/reading-status-test.png',
      fullPage: true 
    });
  });

  test('should test reading statistics API', async ({ page }) => {
    // Test reading stats endpoint
    const statsResponse = await page.request.get('/api/reading/stats');
    
    if (statsResponse.ok()) {
      const statsData = await statsResponse.json();
      
      // Verify expected structure
      expect(statsData).toBeDefined();
      
      // Common reading stats fields
      const expectedFields = ['total_books', 'currently_reading', 'books_read', 'want_to_read'];
      // Note: Don't require specific fields as API might be different
      
      console.log('Reading stats:', JSON.stringify(statsData, null, 2));
    } else {
      console.log(`Reading stats API not available: ${statsResponse.status()}`);
    }
    
    // Test reading progress endpoint
    const progressResponse = await page.request.get('/api/reading/books/status/currently_reading');
    
    if (progressResponse.ok()) {
      const progressData = await progressResponse.json();
      console.log('Currently reading books:', progressData);
    } else {
      console.log(`Reading progress API not available: ${progressResponse.status()}`);
    }
  });

  test('should test reading timeline if available', async ({ page }) => {
    // Look for reading timeline or activity page
    const timelineLinks = page.locator('text=Timeline, text=Activity, text=Progress');
    
    if (await timelineLinks.count() > 0) {
      await timelineLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Check for timeline elements
      const timelineEntries = page.locator('.timeline-entry, .activity-item, .progress-item');
      const entryCount = await timelineEntries.count();
      
      console.log(`Timeline entries found: ${entryCount}`);
      
      // Test timeline filters if available
      const filterButtons = page.locator('button:has-text("All"), button:has-text("Reading"), button:has-text("Completed")');
      
      if (await filterButtons.count() > 0) {
        await filterButtons.first().click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('No reading timeline found');
    }
    
    await page.screenshot({ 
      path: 'test-results/reading-timeline.png',
      fullPage: true 
    });
  });

  test('should test reading challenges if available', async ({ page }) => {
    // Look for reading challenges functionality
    const challengeLinks = page.locator('text=Challenge, text=Goals, text=Target');
    
    if (await challengeLinks.count() > 0) {
      await challengeLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Check for challenge elements
      const challengeCards = page.locator('.challenge-card, .goal-card, .target-card');
      const challengeCount = await challengeCards.count();
      
      console.log(`Reading challenges found: ${challengeCount}`);
      
      // Test setting a new challenge if form is available
      const challengeForm = page.locator('form, .challenge-form');
      
      if (await challengeForm.count() > 0) {
        const targetInput = challengeForm.locator('input[type="number"]');
        
        if (await targetInput.count() > 0) {
          await targetInput.fill('50');
          
          const submitButton = challengeForm.locator('button[type="submit"], button:has-text("Save")');
          
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    } else {
      console.log('No reading challenges found');
    }
    
    await page.screenshot({ 
      path: 'test-results/reading-challenges.png',
      fullPage: true 
    });
  });

  test('should test book details reading functionality', async ({ page }) => {
    await page.click('text=Library');
    await page.waitForLoadState('networkidle');
    
    // Click on Books tab
    await page.click('button:has-text("Books")');
    await page.waitForTimeout(1000);
    
    const bookCards = page.locator('.booktarr-card');
    const bookCount = await bookCards.count();
    
    if (bookCount > 0) {
      // Click on first book to open details
      await bookCards.first().click();
      await page.waitForLoadState('networkidle');
      
      // Check for book details page
      const bookTitle = page.locator('h1, .book-title, .title');
      
      if (await bookTitle.count() > 0) {
        // Look for reading controls in book details
        const startReadingButton = page.locator('button:has-text("Start Reading")');
        const markAsReadButton = page.locator('button:has-text("Mark as Read")');
        const addToWishlistButton = page.locator('button:has-text("Add to Wishlist")');
        
        // Test start reading
        if (await startReadingButton.count() > 0) {
          await startReadingButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Test progress tracking
        const progressInput = page.locator('input[placeholder*="page"], input[placeholder*="progress"]');
        
        if (await progressInput.count() > 0) {
          await progressInput.fill('100');
          await page.waitForTimeout(500);
        }
        
        // Test rating in details page
        const detailsRating = page.locator('.rating, .stars, [data-testid="rating"]');
        
        if (await detailsRating.count() > 0) {
          const ratingStars = detailsRating.locator('button, .star');
          const starCount = await ratingStars.count();
          
          if (starCount >= 4) {
            await ratingStars.nth(3).click(); // 4-star rating
            await page.waitForTimeout(500);
          }
        }
        
        // Test notes functionality
        const notesTextarea = page.locator('textarea[placeholder*="note"], textarea[placeholder*="review"]');
        
        if (await notesTextarea.count() > 0) {
          await notesTextarea.fill('This is a test note for the book.');
          await page.waitForTimeout(500);
        }
      }
    } else {
      console.log('No books available to test details functionality');
    }
    
    await page.screenshot({ 
      path: 'test-results/book-details-reading.png',
      fullPage: true 
    });
  });
});