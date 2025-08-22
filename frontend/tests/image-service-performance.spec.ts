import { test, expect } from '@playwright/test';

test.describe('Image Service Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should test cover image loading and optimization @visual', async ({ page }) => {
    // Navigate to library to see book covers
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Measure image loading performance
    const imageMetrics = {
      total_images: 0,
      loaded_images: 0,
      failed_images: 0,
      load_times: []
    };
    
    // Count all images on the page
    const allImages = page.locator('img');
    const imageCount = await allImages.count();
    imageMetrics.total_images = imageCount;
    
    console.log(`Found ${imageCount} images on library page`);
    
    // Test loading of book cover images specifically
    const bookCoverImages = page.locator('img[src*="/covers/"], img[alt*="cover" i], .book-cover img');
    const coverCount = await bookCoverImages.count();
    
    console.log(`Found ${coverCount} book cover images`);
    
    if (coverCount > 0) {
      // Measure cover image loading times
      for (let i = 0; i < Math.min(5, coverCount); i++) {
        const startTime = Date.now();
        
        const coverImage = bookCoverImages.nth(i);
        const src = await coverImage.getAttribute('src');
        
        if (src) {
          // Wait for image to load
          await coverImage.waitFor({ state: 'attached' });
          
          // Check if image loaded successfully
          const naturalWidth = await coverImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
          
          if (naturalWidth > 0) {
            const loadTime = Date.now() - startTime;
            imageMetrics.load_times.push(loadTime);
            imageMetrics.loaded_images++;
            console.log(`Cover image ${i + 1} loaded in ${loadTime}ms: ${src}`);
          } else {
            imageMetrics.failed_images++;
            console.log(`Cover image ${i + 1} failed to load: ${src}`);
          }
        }
      }
    }
    
    // Take screenshot of loaded covers
    await page.screenshot({ 
      path: 'test-results/cover-images-loaded.png',
      fullPage: true 
    });
    
    // Calculate performance metrics
    if (imageMetrics.load_times.length > 0) {
      const avgLoadTime = imageMetrics.load_times.reduce((sum, time) => sum + time, 0) / imageMetrics.load_times.length;
      const maxLoadTime = Math.max(...imageMetrics.load_times);
      const minLoadTime = Math.min(...imageMetrics.load_times);
      
      console.log('Image Loading Performance:', JSON.stringify({
        total_images: imageMetrics.total_images,
        cover_images: coverCount,
        loaded_successfully: imageMetrics.loaded_images,
        failed_to_load: imageMetrics.failed_images,
        average_load_time_ms: Math.round(avgLoadTime),
        max_load_time_ms: maxLoadTime,
        min_load_time_ms: minLoadTime,
        success_rate: ((imageMetrics.loaded_images / coverCount) * 100).toFixed(1) + '%'
      }, null, 2));
    }
  });

  test('should test image caching and cache management @visual', async ({ page }) => {
    // Test image cache statistics
    console.log('Testing image cache functionality...');
    
    const cacheStatsResponse = await page.request.get('/api/images/cache/stats');
    
    if (cacheStatsResponse.ok()) {
      const cacheStats = await cacheStatsResponse.json();
      console.log('Image cache stats API response:', JSON.stringify({
        cache_entries: cacheStats.cache_entries,
        valid_cache_entries: cacheStats.valid_cache_entries,
        total_images: cacheStats.total_images,
        total_size_mb: cacheStats.total_size_mb,
        average_image_size_kb: cacheStats.average_image_size_kb
      }, null, 2));
      
      expect(cacheStats.total_images).toBeGreaterThanOrEqual(0);
    } else {
      console.log('Image cache stats API status:', cacheStatsResponse.status());
    }
    
    // Test cache all covers endpoint
    const cacheAllResponse = await page.request.post('/api/images/cache/all');
    
    if (cacheAllResponse.ok()) {
      const cacheAllData = await cacheAllResponse.json();
      console.log('Cache all covers API response:', JSON.stringify({
        success: cacheAllData.success,
        cached_covers: cacheAllData.cached_covers,
        errors: cacheAllData.errors,
        message: cacheAllData.message
      }, null, 2));
      
      expect(cacheAllData.success).toBe(true);
    } else {
      console.log('Cache all covers API status:', cacheAllResponse.status());
    }
    
    // Test individual image info
    const testISBN = '9780140328721';
    const imageInfoResponse = await page.request.get(`/api/images/info/${testISBN}`);
    
    if (imageInfoResponse.ok()) {
      const imageInfo = await imageInfoResponse.json();
      console.log(`Image info for ISBN ${testISBN}:`, JSON.stringify({
        isbn: imageInfo.isbn,
        book_cover_exists: imageInfo.book_cover_exists,
        series_cover_exists: imageInfo.series_cover_exists,
        book_cover_path: imageInfo.book_cover_path,
        book_cover_size: imageInfo.book_cover_size
      }, null, 2));
    } else {
      console.log(`Image info API status for ${testISBN}:`, imageInfoResponse.status());
    }
    
    // Navigate to settings to test cache management UI
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Look for image cache management interface
    const cacheManagementElements = {
      cache_section: page.locator('h2:has-text("Cache"), h3:has-text("Images"), .cache-management').first(),
      cache_stats: page.locator('.cache-stats, [data-testid="cache-stats"]').first(),
      cache_clear: page.locator('button:has-text("Clear Cache"), button:has-text("Clear Images")').first(),
      cache_refresh: page.locator('button:has-text("Refresh"), button:has-text("Update Cache")').first()
    };
    
    for (const [element, locator] of Object.entries(cacheManagementElements)) {
      const isVisible = await locator.isVisible();
      console.log(`Cache management element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    await page.screenshot({ 
      path: 'test-results/image-cache-management.png',
      fullPage: true 
    });
  });

  test('should test thumbnail generation and optimization @visual', async ({ page }) => {
    // Test thumbnail generation functionality
    console.log('Testing thumbnail generation and optimization...');
    
    // Navigate to library page
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for thumbnail images specifically
    const thumbnailImages = page.locator('img[src*="thumb"], img[src*="thumbnail"], .thumbnail img');
    const thumbnailCount = await thumbnailImages.count();
    
    console.log(`Found ${thumbnailCount} thumbnail images`);
    
    if (thumbnailCount > 0) {
      // Test loading of thumbnails
      for (let i = 0; i < Math.min(3, thumbnailCount); i++) {
        const thumbnail = thumbnailImages.nth(i);
        const src = await thumbnail.getAttribute('src');
        
        if (src) {
          // Measure thumbnail size and load performance
          const response = await page.request.get(src);
          
          if (response.ok()) {
            const contentLength = response.headers()['content-length'];
            const size = contentLength ? parseInt(contentLength) : 0;
            
            console.log(`Thumbnail ${i + 1}: ${src}, Size: ${size} bytes`);
          }
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/thumbnail-images.png',
        fullPage: true 
      });
    }
    
    // Test image optimization API
    const optimizeResponse = await page.request.post('/api/images/optimize');
    
    if (optimizeResponse.ok()) {
      const optimizeData = await optimizeResponse.json();
      console.log('Image optimization API response:', JSON.stringify({
        success: optimizeData.success,
        processed_files: optimizeData.processed_files,
        total_size_saved: optimizeData.total_size_saved,
        results: optimizeData.results
      }, null, 2));
    } else {
      console.log('Image optimization API status:', optimizeResponse.status());
    }
    
    // Test different view modes and their thumbnail usage
    const viewModeButtons = page.locator('button:has-text("Grid"), button:has-text("List"), .view-mode-btn');
    const viewModeCount = await viewModeButtons.count();
    
    console.log(`Found ${viewModeCount} view mode options`);
    
    if (viewModeCount > 0) {
      for (let i = 0; i < viewModeCount; i++) {
        const viewButton = viewModeButtons.nth(i);
        const buttonText = await viewButton.textContent();
        
        if (await viewButton.isVisible()) {
          await viewButton.click();
          await page.waitForTimeout(1000);
          
          // Check thumbnail usage in this view
          const currentThumbnails = page.locator('img[src*="thumb"], img[src*="thumbnail"]');
          const currentCount = await currentThumbnails.count();
          
          console.log(`View mode "${buttonText}": ${currentCount} thumbnails displayed`);
          
          await page.screenshot({ 
            path: `test-results/thumbnails-${buttonText?.toLowerCase().replace(/\s+/g, '-')}.png`,
            fullPage: true 
          });
        }
      }
    }
  });

  test('should test series cover synchronization @visual', async ({ page }) => {
    // Test series cover synchronization functionality
    console.log('Testing series cover synchronization...');
    
    // Navigate to series page
    await page.click('button:has-text("Series")');
    await page.waitForLoadState('networkidle');
    
    // Find a series to test with
    const seriesCards = page.locator('[data-testid="series-card"], .series-card, .card').first();
    
    if (await seriesCards.isVisible()) {
      // Get series name
      const seriesTitle = await page.locator('h2, h3, .series-title').first().textContent();
      
      if (seriesTitle) {
        const encodedSeriesName = encodeURIComponent(seriesTitle.trim());
        console.log(`Testing cover sync for series: ${seriesTitle}`);
        
        // Test series cover sync API
        const syncResponse = await page.request.post(`/api/images/series/${encodedSeriesName}/sync`);
        
        if (syncResponse.ok()) {
          const syncData = await syncResponse.json();
          console.log('Series cover sync API response:', JSON.stringify({
            success: syncData.success,
            message: syncData.message,
            matched_covers: syncData.matched_covers,
            downloaded_covers: syncData.downloaded_covers,
            total_processed: syncData.total_processed
          }, null, 2));
          
          expect(syncData.success).toBe(true);
        } else {
          console.log(`Series cover sync API status for "${seriesTitle}":`, syncResponse.status());
        }
        
        // Click on series to see volume covers
        await seriesCards.click();
        await page.waitForLoadState('networkidle');
        
        // Check for volume cover images
        const volumeCovers = page.locator('.volume-cover, img[src*="covers/"], .cover-image');
        const volumeCoverCount = await volumeCovers.count();
        
        console.log(`Found ${volumeCoverCount} volume cover images in series details`);
        
        await page.screenshot({ 
          path: 'test-results/series-volume-covers.png',
          fullPage: true 
        });
      }
    }
    
    // Test bulk series cover sync
    const bulkSyncResponse = await page.request.post('/api/images/series/bulk-sync', {
      data: {
        series_names: ['One Piece', 'Naruto', 'Bleach'],
        force_redownload: false
      }
    });
    
    if (bulkSyncResponse.ok()) {
      const bulkData = await bulkSyncResponse.json();
      console.log('Bulk series sync API response:', JSON.stringify({
        success: bulkData.success,
        processed_series: bulkData.processed_series,
        total_covers_synced: bulkData.total_covers_synced
      }, null, 2));
    } else {
      console.log('Bulk series sync API status:', bulkSyncResponse.status());
    }
  });

  test('should test progressive image loading and lazy loading @visual', async ({ page }) => {
    // Test progressive/lazy loading of images
    console.log('Testing progressive and lazy image loading...');
    
    // Navigate to library with many books
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Check for lazy loading indicators
    const lazyLoadingElements = {
      loading_placeholder: page.locator('.image-placeholder, .skeleton-image, [data-testid="image-loading"]'),
      lazy_images: page.locator('img[loading="lazy"], img[data-src]'),
      progressive_images: page.locator('img[src*="progressive"], .progressive-image')
    };
    
    for (const [type, locator] of Object.entries(lazyLoadingElements)) {
      const count = await locator.count();
      console.log(`${type}: ${count} elements found`);
    }
    
    // Test scroll-triggered lazy loading
    const initialImages = page.locator('img[src]');
    const initialCount = await initialImages.count();
    
    console.log(`Initially loaded images: ${initialCount}`);
    
    // Scroll to bottom to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(2000);
    
    const afterScrollImages = page.locator('img[src]');
    const afterScrollCount = await afterScrollImages.count();
    
    console.log(`Images after scroll: ${afterScrollCount}`);
    
    const lazyLoadedCount = afterScrollCount - initialCount;
    if (lazyLoadedCount > 0) {
      console.log(`Lazy loaded ${lazyLoadedCount} additional images`);
    }
    
    await page.screenshot({ 
      path: 'test-results/lazy-loading-after-scroll.png',
      fullPage: true 
    });
    
    // Test intersection observer behavior
    const intersectionTest = await page.evaluate(() => {
      return {
        has_intersection_observer: 'IntersectionObserver' in window,
        has_loading_attribute: 'loading' in HTMLImageElement.prototype
      };
    });
    
    console.log('Browser lazy loading support:', JSON.stringify(intersectionTest, null, 2));
  });

  test('should test image error handling and fallbacks @visual', async ({ page }) => {
    // Test image error handling and fallback mechanisms
    console.log('Testing image error handling and fallbacks...');
    
    // Navigate to library page
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Check for broken image handling
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.naturalWidth || img.naturalWidth === 0).length;
    });
    
    console.log(`Found ${brokenImages} potentially broken images`);
    
    // Test fallback mechanisms
    const fallbackElements = {
      default_covers: page.locator('img[src*="default"], img[src*="placeholder"], .default-cover'),
      no_cover_indicators: page.locator('.no-cover, .missing-cover, [data-testid="no-cover"]'),
      error_states: page.locator('.image-error, .cover-error, [data-testid="image-error"]')
    };
    
    for (const [type, locator] of Object.entries(fallbackElements)) {
      const count = await locator.count();
      console.log(`${type}: ${count} elements found`);
    }
    
    await page.screenshot({ 
      path: 'test-results/image-fallbacks.png',
      fullPage: true 
    });
    
    // Test API error handling for invalid image requests
    const invalidImageResponse = await page.request.get('/api/images/info/invalid-isbn-123');
    console.log('Invalid image info API status:', invalidImageResponse.status());
    
    const invalidSyncResponse = await page.request.post('/api/images/series/NonExistentSeries/sync');
    console.log('Invalid series sync API status:', invalidSyncResponse.status());
    
    // Test network error simulation (if possible)
    try {
      // Simulate network issues by requesting a non-existent image
      const networkErrorResponse = await page.request.get('/static/covers/books/nonexistent.jpg');
      console.log('Network error simulation status:', networkErrorResponse.status());
    } catch (error) {
      console.log('Network error handled:', error.message);
    }
  });

  test('should test image service performance under load @visual', async ({ page }) => {
    // Test image service performance with multiple concurrent requests
    console.log('Testing image service performance under load...');
    
    const performanceMetrics = {
      concurrent_requests: 10,
      total_time: 0,
      success_count: 0,
      error_count: 0,
      response_times: []
    };
    
    // Test multiple concurrent image requests
    const concurrentRequests = [];
    const testISBNs = [
      '9780140328721',
      '9781421506630',
      '9781542889697',
      '9780134685991',
      '9781234567890'
    ];
    
    const startTime = Date.now();
    
    for (let i = 0; i < performanceMetrics.concurrent_requests; i++) {
      const isbn = testISBNs[i % testISBNs.length];
      const requestPromise = page.request.get(`/api/images/info/${isbn}`)
        .then(response => {
          const requestTime = Date.now() - startTime;
          performanceMetrics.response_times.push(requestTime);
          
          if (response.ok()) {
            performanceMetrics.success_count++;
          } else {
            performanceMetrics.error_count++;
          }
          
          return response;
        })
        .catch(error => {
          performanceMetrics.error_count++;
          console.log('Request error:', error.message);
        });
      
      concurrentRequests.push(requestPromise);
    }
    
    // Wait for all requests to complete
    await Promise.all(concurrentRequests);
    
    performanceMetrics.total_time = Date.now() - startTime;
    
    if (performanceMetrics.response_times.length > 0) {
      const avgResponseTime = performanceMetrics.response_times.reduce((sum, time) => sum + time, 0) / performanceMetrics.response_times.length;
      const maxResponseTime = Math.max(...performanceMetrics.response_times);
      const minResponseTime = Math.min(...performanceMetrics.response_times);
      
      console.log('Image Service Performance Under Load:', JSON.stringify({
        concurrent_requests: performanceMetrics.concurrent_requests,
        total_time_ms: performanceMetrics.total_time,
        success_count: performanceMetrics.success_count,
        error_count: performanceMetrics.error_count,
        success_rate: ((performanceMetrics.success_count / performanceMetrics.concurrent_requests) * 100).toFixed(1) + '%',
        average_response_time_ms: Math.round(avgResponseTime),
        max_response_time_ms: maxResponseTime,
        min_response_time_ms: minResponseTime,
        requests_per_second: (performanceMetrics.concurrent_requests / (performanceMetrics.total_time / 1000)).toFixed(2)
      }, null, 2));
    }
    
    // Test cache performance
    const cacheStartTime = Date.now();
    const cacheResponse = await page.request.get('/api/images/cache/stats');
    const cacheTime = Date.now() - cacheStartTime;
    
    console.log(`Cache stats API response time: ${cacheTime}ms, Status: ${cacheResponse.status()}`);
    
    await page.screenshot({ 
      path: 'test-results/image-service-performance.png',
      fullPage: true 
    });
  });

  test('should test CDN and external image integration @visual', async ({ page }) => {
    // Test CDN and external image source integration
    console.log('Testing CDN and external image integration...');
    
    // Check for external image sources
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    const externalImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const external = images.filter(img => 
        img.src && !img.src.startsWith(window.location.origin)
      );
      
      return external.map(img => ({
        src: img.src,
        origin: new URL(img.src).origin,
        loaded: img.naturalWidth > 0
      }));
    });
    
    console.log('External images found:', JSON.stringify({
      count: externalImages.length,
      sources: [...new Set(externalImages.map(img => img.origin))],
      loaded_count: externalImages.filter(img => img.loaded).length
    }, null, 2));
    
    // Test image CDN headers and caching
    if (externalImages.length > 0) {
      const firstExternalImage = externalImages[0];
      
      try {
        const imageResponse = await page.request.get(firstExternalImage.src);
        const headers = imageResponse.headers();
        
        console.log('External image headers:', JSON.stringify({
          'cache-control': headers['cache-control'],
          'content-type': headers['content-type'],
          'content-length': headers['content-length'],
          'last-modified': headers['last-modified'],
          'etag': headers['etag']
        }, null, 2));
      } catch (error) {
        console.log('Error fetching external image headers:', error.message);
      }
    }
    
    // Test local CDN/static file serving
    const localImageResponse = await page.request.get('/static/covers/books/test.jpg');
    console.log('Local image serving status:', localImageResponse.status());
    
    if (localImageResponse.status() === 404) {
      console.log('No local test image found - this is expected for new installations');
    }
    
    await page.screenshot({ 
      path: 'test-results/cdn-external-images.png',
      fullPage: true 
    });
  });

  test('should test mobile image performance and responsive loading @visual', async ({ page }) => {
    // Test mobile image performance and responsive loading
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing mobile image performance...');
    
    // Navigate to library on mobile
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Measure mobile image loading
    const mobileImageMetrics = {
      images_loaded: 0,
      total_size_estimated: 0,
      load_times: []
    };
    
    const mobileImages = page.locator('img');
    const mobileImageCount = await mobileImages.count();
    
    console.log(`Mobile viewport: ${mobileImageCount} images found`);
    
    // Test responsive image loading
    for (let i = 0; i < Math.min(3, mobileImageCount); i++) {
      const image = mobileImages.nth(i);
      const src = await image.getAttribute('src');
      
      if (src) {
        const startTime = Date.now();
        
        // Check if image is responsive
        const srcset = await image.getAttribute('srcset');
        const sizes = await image.getAttribute('sizes');
        
        await image.waitFor({ state: 'attached' });
        
        const naturalWidth = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
        
        if (naturalWidth > 0) {
          const loadTime = Date.now() - startTime;
          mobileImageMetrics.load_times.push(loadTime);
          mobileImageMetrics.images_loaded++;
          
          console.log(`Mobile image ${i + 1}:`, {
            src: src,
            has_srcset: !!srcset,
            has_sizes: !!sizes,
            load_time_ms: loadTime,
            natural_width: naturalWidth
          });
        }
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/mobile-image-performance.png',
      fullPage: true 
    });
    
    // Test mobile-specific optimizations
    const mobileOptimizations = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      
      return {
        images_with_srcset: images.filter(img => img.srcset).length,
        images_with_sizes: images.filter(img => img.sizes).length,
        images_with_lazy_loading: images.filter(img => img.loading === 'lazy').length,
        total_images: images.length
      };
    });
    
    console.log('Mobile image optimizations:', JSON.stringify(mobileOptimizations, null, 2));
    
    // Calculate mobile performance metrics
    if (mobileImageMetrics.load_times.length > 0) {
      const avgLoadTime = mobileImageMetrics.load_times.reduce((sum, time) => sum + time, 0) / mobileImageMetrics.load_times.length;
      
      console.log('Mobile Image Performance Summary:', JSON.stringify({
        images_tested: mobileImageMetrics.load_times.length,
        average_load_time_ms: Math.round(avgLoadTime),
        all_images_loaded: mobileImageMetrics.images_loaded === mobileImageMetrics.load_times.length,
        mobile_optimizations: mobileOptimizations
      }, null, 2));
    }
  });
});