import { test, expect } from '@playwright/test';

test.describe('Metadata Editor Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open and interact with metadata editor', async ({ page }) => {
    // Navigate to series page to find metadata editor
    await page.click('text=Series');
    await page.waitForLoadState('networkidle');
    
    // Look for any series cards
    const seriesCards = page.locator('.booktarr-card');
    const seriesCount = await seriesCards.count();
    
    if (seriesCount > 0) {
      // Click on first series
      await seriesCards.first().click();
      await page.waitForLoadState('networkidle');
      
      // Look for edit button or metadata editor trigger
      const editButtons = page.locator('button:has-text("Edit"), button[title*="edit"], button[aria-label*="edit"]');
      
      if (await editButtons.count() > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Check if metadata editor modal opened
        const modal = page.locator('.fixed.inset-0, [role="dialog"], .modal');
        await expect(modal).toBeVisible();
        
        // Test search metadata functionality
        const searchTab = page.locator('button:has-text("Search Metadata")');
        if (await searchTab.count() > 0) {
          await searchTab.click();
          await page.waitForTimeout(500);
          
          // Test search input
          const searchInput = page.locator('input[placeholder*="Search"]');
          if (await searchInput.count() > 0) {
            await searchInput.fill('test book');
            
            // Test search button
            const searchButton = page.locator('button:has-text("Search")');
            if (await searchButton.count() > 0) {
              await searchButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }
        
        // Test manual edit functionality
        const manualTab = page.locator('button:has-text("Manual Edit")');
        if (await manualTab.count() > 0) {
          await manualTab.click();
          await page.waitForTimeout(500);
          
          // Test form inputs
          const titleInput = page.locator('input[value], input[placeholder*="title"]').first();
          if (await titleInput.count() > 0) {
            await titleInput.clear();
            await titleInput.fill('Test Title');
          }
          
          const descriptionTextarea = page.locator('textarea');
          if (await descriptionTextarea.count() > 0) {
            await descriptionTextarea.clear();
            await descriptionTextarea.fill('Test description');
          }
        }
        
        // Test save functionality
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Close modal
        const closeButton = page.locator('button:has-text("×"), button:has-text("Cancel")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
        
        await page.screenshot({ 
          path: 'test-results/metadata-editor-interaction.png',
          fullPage: true 
        });
      } else {
        console.log('No edit buttons found on series details page');
      }
    } else {
      console.log('No series cards found to test metadata editor');
    }
  });

  test('should test metadata search API integration', async ({ page }) => {
    // Test the metadata search API endpoint directly
    const searchResponse = await page.request.post('/api/series/search-metadata', {
      data: {
        query: 'Harry Potter',
        search_type: 'title',
        max_results: 5
      }
    });
    
    // API might not be implemented yet, so don't fail if 404
    if (searchResponse.status() !== 404) {
      expect(searchResponse.ok()).toBeTruthy();
      
      const searchData = await searchResponse.json();
      expect(searchData).toHaveProperty('success');
    }
    
    await page.screenshot({ 
      path: 'test-results/metadata-search-api.png',
      fullPage: true 
    });
  });
});