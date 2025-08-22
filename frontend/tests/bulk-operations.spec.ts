import { test, expect } from '@playwright/test';

test.describe('Bulk Operations Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should perform bulk status updates on multiple books @visual', async ({ page }) => {
    // Navigate to library or bulk operations page
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for bulk operations UI
    const bulkSelector = page.locator('[data-testid="bulk-select"], .bulk-select, .select-all').first();
    
    if (await bulkSelector.isVisible()) {
      // Use UI for bulk selection
      await bulkSelector.click();
      await page.waitForTimeout(1000);
      
      // Look for bulk action buttons
      const bulkActions = page.locator('[data-testid="bulk-actions"], .bulk-actions, .batch-operations').first();
      
      if (await bulkActions.isVisible()) {
        await page.screenshot({ 
          path: 'test-results/bulk-operations-ui.png',
          fullPage: true 
        });
      }
    }
    
    // Test bulk status update API directly
    const bulkStatusResponse = await page.request.post('/api/bulk/status', {
      data: {
        book_ids: [1, 2, 3],
        new_status: 'own',
        user_id: 1,
        notes: 'Bulk marked as owned via test'
      }
    });
    
    if (bulkStatusResponse.ok()) {
      const statusData = await bulkStatusResponse.json();
      console.log('Bulk status update API response:', JSON.stringify({
        success: statusData.success,
        operation_id: statusData.operation_id,
        operation_type: statusData.operation_type,
        total_items: statusData.total_items,
        success_count: statusData.success_count,
        error_count: statusData.error_count
      }, null, 2));
      
      expect(statusData.success).toBe(true);
      expect(statusData.operation_type).toBe('status_update');
      
      // Check operation status
      if (statusData.operation_id) {
        const operationResponse = await page.request.get(`/api/bulk/operation/${statusData.operation_id}`);
        if (operationResponse.ok()) {
          const operationData = await operationResponse.json();
          console.log('Operation status:', operationData.operation.status);
        }
      }
    } else {
      console.log('Bulk status update API status:', bulkStatusResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/bulk-status-update.png',
      fullPage: true 
    });
  });

  test('should perform series-wide operations @visual', async ({ page }) => {
    // Navigate to Series page
    await page.click('button:has-text("Series")');
    await page.waitForLoadState('networkidle');
    
    // Look for series bulk operations
    const seriesCards = page.locator('[data-testid="series-card"], .series-card').first();
    
    if (await seriesCards.isVisible()) {
      await seriesCards.click();
      await page.waitForLoadState('networkidle');
      
      // Look for series-wide action buttons
      const seriesActions = page.locator('[data-testid="series-actions"], .series-actions, button:has-text("Mark All")').first();
      
      if (await seriesActions.isVisible()) {
        await page.screenshot({ 
          path: 'test-results/series-bulk-actions.png',
          fullPage: true 
        });
      }
    }
    
    // Test series operation API
    const seriesOpResponse = await page.request.post('/api/bulk/series', {
      data: {
        series_name: 'One Piece',
        operation: 'mark_all_owned',
        parameters: {
          notes: 'Bulk marked as owned via test'
        },
        user_id: 1
      }
    });
    
    if (seriesOpResponse.ok()) {
      const seriesData = await seriesOpResponse.json();
      console.log('Series operation API response:', JSON.stringify({
        success: seriesData.success,
        operation_id: seriesData.operation_id,
        operation_type: seriesData.operation_type,
        total_items: seriesData.total_items,
        success_count: seriesData.success_count
      }, null, 2));
      
      expect(seriesData.success).toBe(true);
      expect(seriesData.operation_type).toContain('series_mark_all_owned');
    } else {
      console.log('Series operation API status:', seriesOpResponse.status());
    }
    
    // Test quick series operations
    const quickSeriesResponse = await page.request.post('/api/bulk/mark-series-read/One%20Piece?rating=5&user_id=1');
    
    if (quickSeriesResponse.ok()) {
      const quickData = await quickSeriesResponse.json();
      console.log('Quick series read API response:', JSON.stringify(quickData, null, 2));
      expect(quickData.success).toBe(true);
    } else {
      console.log('Quick series read API status:', quickSeriesResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/series-operations-complete.png',
      fullPage: true 
    });
  });

  test('should perform author-based bulk operations @visual', async ({ page }) => {
    // Test author-based bulk operations
    const authorOpResponse = await page.request.post('/api/bulk/mark-author-books-owned/Oda,%20Eiichiro?user_id=1');
    
    if (authorOpResponse.ok()) {
      const authorData = await authorOpResponse.json();
      console.log('Author bulk operation API response:', JSON.stringify(authorData, null, 2));
      expect(authorData.success).toBe(true);
    } else {
      console.log('Author bulk operation API status:', authorOpResponse.status());
    }
    
    // Test bulk operation by author names in general API
    const bulkAuthorResponse = await page.request.post('/api/bulk/status', {
      data: {
        author_names: ['Oda, Eiichiro', 'Toriyama, Akira'],
        new_status: 'want',
        user_id: 1,
        notes: 'Bulk marked as wanted - favorite authors'
      }
    });
    
    if (bulkAuthorResponse.ok()) {
      const bulkAuthorData = await bulkAuthorResponse.json();
      console.log('Bulk author status API response:', JSON.stringify({
        success: bulkAuthorData.success,
        total_items: bulkAuthorData.total_items,
        success_count: bulkAuthorData.success_count
      }, null, 2));
      
      expect(bulkAuthorData.success).toBe(true);
    } else {
      console.log('Bulk author status API status:', bulkAuthorResponse.status());
    }
    
    // Navigate to authors page or search
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('Oda, Eiichiro');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/author-bulk-operations.png',
      fullPage: true 
    });
  });

  test('should perform bulk reading progress updates @visual', async ({ page }) => {
    // Test bulk reading progress update
    const readingProgressItems = [
      {
        book_id: 1,
        status: 'finished',
        rating: 5,
        progress_percentage: 100.0,
        notes: 'Excellent series opener'
      },
      {
        book_id: 2,
        status: 'currently_reading',
        progress_percentage: 45.0,
        current_page: 180,
        total_pages: 400
      },
      {
        isbn: '9781421506630',
        status: 'want_to_read',
        rating: null,
        notes: 'Added to reading list'
      }
    ];
    
    const bulkProgressResponse = await page.request.post('/api/bulk/reading-progress', {
      data: {
        items: readingProgressItems,
        user_id: 1
      }
    });
    
    if (bulkProgressResponse.ok()) {
      const progressData = await bulkProgressResponse.json();
      console.log('Bulk reading progress API response:', JSON.stringify({
        success: progressData.success,
        operation_type: progressData.operation_type,
        total_items: progressData.total_items,
        success_count: progressData.success_count,
        error_count: progressData.error_count
      }, null, 2));
      
      expect(progressData.success).toBe(true);
      expect(progressData.operation_type).toBe('reading_progress_update');
    } else {
      console.log('Bulk reading progress API status:', bulkProgressResponse.status());
    }
    
    // Navigate to reading progress page
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for reading progress indicators
    const progressIndicators = page.locator('[data-testid="reading-progress"], .progress-bar, .reading-status').first();
    
    if (await progressIndicators.isVisible()) {
      await page.screenshot({ 
        path: 'test-results/bulk-reading-progress.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/reading-progress-complete.png',
      fullPage: true 
    });
  });

  test('should perform bulk metadata updates @visual', async ({ page }) => {
    // Test bulk metadata update
    const metadataUpdates = {
      publisher: 'Updated Publisher',
      book_format: 'Digital',
      notes: 'Bulk metadata update test'
    };
    
    const bulkMetadataResponse = await page.request.post('/api/bulk/metadata', {
      data: {
        book_ids: [1, 2, 3],
        updates: metadataUpdates,
        user_id: 1
      }
    });
    
    if (bulkMetadataResponse.ok()) {
      const metadataData = await bulkMetadataResponse.json();
      console.log('Bulk metadata update API response:', JSON.stringify({
        success: metadataData.success,
        operation_type: metadataData.operation_type,
        total_items: metadataData.total_items,
        success_count: metadataData.success_count,
        error_count: metadataData.error_count
      }, null, 2));
      
      expect(metadataData.success).toBe(true);
      expect(metadataData.operation_type).toBe('metadata_update');
    } else {
      console.log('Bulk metadata update API status:', bulkMetadataResponse.status());
    }
    
    // Navigate to book details to check metadata
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for book cards and click on one
    const bookCards = page.locator('[data-testid="book-card"], .book-card, .card').first();
    
    if (await bookCards.isVisible()) {
      await bookCards.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/bulk-metadata-update.png',
        fullPage: true 
      });
    }
  });

  test('should handle bulk deletion operations @visual', async ({ page }) => {
    // Test bulk deletion (user data only)
    const bulkDeleteResponse = await page.request.delete('/api/bulk/books', {
      data: {
        book_ids: [999, 998], // Non-critical test IDs
        delete_reading_progress: true,
        delete_user_status: true,
        user_id: 1
      }
    });
    
    if (bulkDeleteResponse.ok()) {
      const deleteData = await bulkDeleteResponse.json();
      console.log('Bulk deletion API response:', JSON.stringify({
        success: deleteData.success,
        operation_type: deleteData.operation_type,
        total_items: deleteData.total_items,
        success_count: deleteData.success_count,
        error_count: deleteData.error_count
      }, null, 2));
      
      expect(deleteData.success).toBe(true);
      expect(deleteData.operation_type).toBe('deletion');
    } else {
      console.log('Bulk deletion API status:', bulkDeleteResponse.status());
    }
    
    // Test deletion by series
    const seriesDeleteResponse = await page.request.delete('/api/bulk/books', {
      data: {
        series_names: ['Test Series'],
        delete_reading_progress: true,
        delete_user_status: true,
        user_id: 1
      }
    });
    
    if (seriesDeleteResponse.ok()) {
      const seriesDeleteData = await seriesDeleteResponse.json();
      console.log('Series deletion API response:', JSON.stringify({
        success: seriesDeleteData.success,
        total_items: seriesDeleteData.total_items
      }, null, 2));
    } else {
      console.log('Series deletion API status:', seriesDeleteResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/bulk-deletion.png',
      fullPage: true 
    });
  });

  test('should track bulk operation progress @visual', async ({ page }) => {
    // Start a bulk operation
    const bulkOpResponse = await page.request.post('/api/bulk/status', {
      data: {
        series_names: ['One Piece', 'Naruto'],
        new_status: 'want',
        user_id: 1,
        notes: 'Progress tracking test'
      }
    });
    
    let operationId = null;
    if (bulkOpResponse.ok()) {
      const opData = await bulkOpResponse.json();
      operationId = opData.operation_id;
      console.log('Started bulk operation with ID:', operationId);
    }
    
    // List all operations
    const operationsListResponse = await page.request.get('/api/bulk/operations');
    
    if (operationsListResponse.ok()) {
      const operationsData = await operationsListResponse.json();
      console.log('Bulk operations list API response:', JSON.stringify({
        success: operationsData.success,
        count: operationsData.count,
        recent_operations: operationsData.operations?.slice(0, 3).map(op => ({
          id: op.id,
          type: op.type,
          status: op.status,
          success_count: op.success_count,
          error_count: op.error_count
        }))
      }, null, 2));
      
      expect(operationsData.success).toBe(true);
      expect(operationsData.operations).toBeDefined();
    } else {
      console.log('Operations list API status:', operationsListResponse.status());
    }
    
    // Check specific operation status if we have an ID
    if (operationId) {
      const statusResponse = await page.request.get(`/api/bulk/operation/${operationId}`);
      
      if (statusResponse.ok()) {
        const statusData = await statusResponse.json();
        console.log('Operation status API response:', JSON.stringify({
          success: statusData.success,
          operation_status: statusData.operation.status,
          processed: statusData.operation.processed_items,
          total: statusData.operation.total_items
        }, null, 2));
        
        expect(statusData.success).toBe(true);
      }
    }
    
    // Look for progress indicators in UI
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Check for jobs/operations section
    const jobsSection = page.locator('[data-testid="jobs"], button:has-text("Jobs"), .jobs-section').first();
    
    if (await jobsSection.isVisible()) {
      await jobsSection.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/bulk-operations-progress.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/operations-tracking.png',
      fullPage: true 
    });
  });

  test('should handle bulk operations with ISBNs @visual', async ({ page }) => {
    // Test bulk operations using ISBN list
    const testISBNs = [
      '9781421506630',
      '9781421515496',
      '9781421534466'
    ];
    
    const isbnBulkResponse = await page.request.post('/api/bulk/status', {
      data: {
        isbns: testISBNs,
        new_status: 'own',
        user_id: 1,
        notes: 'ISBN-based bulk operation test'
      }
    });
    
    if (isbnBulkResponse.ok()) {
      const isbnData = await isbnBulkResponse.json();
      console.log('ISBN bulk operation API response:', JSON.stringify({
        success: isbnData.success,
        operation_type: isbnData.operation_type,
        total_items: isbnData.total_items,
        success_count: isbnData.success_count,
        error_count: isbnData.error_count,
        errors: isbnData.errors?.slice(0, 3) // Show first 3 errors if any
      }, null, 2));
      
      expect(isbnData.success).toBe(true);
    } else {
      console.log('ISBN bulk operation API status:', isbnBulkResponse.status());
    }
    
    // Test with reading progress using ISBNs
    const isbnProgressResponse = await page.request.post('/api/bulk/reading-progress', {
      data: {
        items: [
          {
            isbn: '9781421506630',
            status: 'finished',
            rating: 4,
            notes: 'Great start to the series'
          },
          {
            isbn: '9781421515496',
            status: 'currently_reading',
            progress_percentage: 60.0
          }
        ],
        user_id: 1
      }
    });
    
    if (isbnProgressResponse.ok()) {
      const progressData = await isbnProgressResponse.json();
      console.log('ISBN reading progress bulk API response:', JSON.stringify({
        success: progressData.success,
        total_items: progressData.total_items,
        success_count: progressData.success_count
      }, null, 2));
    } else {
      console.log('ISBN reading progress bulk API status:', isbnProgressResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/isbn-bulk-operations.png',
      fullPage: true 
    });
  });

  test('should test bulk operations in mobile interface', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to library
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for mobile bulk selection interface
    const mobileBulkSelect = page.locator('[data-testid="mobile-bulk"], .mobile-select, .select-mode').first();
    
    if (await mobileBulkSelect.isVisible()) {
      await mobileBulkSelect.tap();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/mobile-bulk-operations.png',
        fullPage: true 
      });
    }
    
    // Test touch-based bulk selection
    const bookCards = page.locator('[data-testid="book-card"], .book-card, .card');
    const cardCount = await bookCards.count();
    
    if (cardCount > 0) {
      // Long press simulation for bulk selection
      await bookCards.first().tap({ force: true });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'test-results/mobile-bulk-selection.png',
        fullPage: true 
      });
    }
    
    // Test mobile API calls (same as desktop)
    const mobileBulkResponse = await page.request.post('/api/bulk/status', {
      data: {
        book_ids: [1, 2],
        new_status: 'want',
        user_id: 1,
        notes: 'Mobile bulk operation test'
      }
    });
    
    if (mobileBulkResponse.ok()) {
      const mobileData = await mobileBulkResponse.json();
      console.log('Mobile bulk operation successful:', mobileData.success);
    }
  });

  test('should handle bulk operation errors and edge cases @visual', async ({ page }) => {
    // Test bulk operation with invalid data
    const invalidBulkResponse = await page.request.post('/api/bulk/status', {
      data: {
        book_ids: [99999, 99998], // Non-existent IDs
        new_status: 'invalid_status',
        user_id: 1
      }
    });
    
    console.log('Invalid bulk operation API status:', invalidBulkResponse.status());
    
    // Test with empty request
    const emptyBulkResponse = await page.request.post('/api/bulk/status', {
      data: {
        new_status: 'own',
        user_id: 1
      }
    });
    
    console.log('Empty bulk operation API status:', emptyBulkResponse.status());
    
    // Test operation status for non-existent operation
    const invalidOpResponse = await page.request.get('/api/bulk/operation/invalid-operation-id');
    console.log('Invalid operation status API:', invalidOpResponse.status());
    
    // Test series operation with non-existent series
    const invalidSeriesResponse = await page.request.post('/api/bulk/series', {
      data: {
        series_name: 'Non-Existent Series 12345',
        operation: 'mark_all_read',
        user_id: 1
      }
    });
    
    if (invalidSeriesResponse.ok()) {
      const invalidSeriesData = await invalidSeriesResponse.json();
      console.log('Invalid series operation response:', JSON.stringify({
        success: invalidSeriesData.success,
        total_items: invalidSeriesData.total_items,
        error_count: invalidSeriesData.error_count
      }, null, 2));
    } else {
      console.log('Invalid series operation API status:', invalidSeriesResponse.status());
    }
    
    await page.screenshot({ 
      path: 'test-results/bulk-operations-error-handling.png',
      fullPage: true 
    });
  });
});