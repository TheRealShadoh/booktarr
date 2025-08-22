import { test, expect } from '@playwright/test';

test.describe('Barcode Scanner Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display mobile barcode scanner interface @visual', async ({ page }) => {
    // Test mobile viewport for scanner
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to page that has scanner access
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for scanner access button or icon
    const scannerButton = page.locator('button:has-text("Scan"), [data-testid="barcode-scanner"], button[title*="scan" i], .scanner-btn').first();
    
    if (await scannerButton.isVisible()) {
      await scannerButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of scanner interface
      await page.screenshot({ 
        path: 'test-results/mobile-barcode-scanner.png',
        fullPage: true 
      });
      
      // Check for scanner components
      const scannerComponents = {
        camera_area: page.locator('video, canvas, .camera-view').first(),
        scanner_overlay: page.locator('.scanning-overlay, .barcode-overlay, [data-testid="scanner-overlay"]').first(),
        permission_prompt: page.locator('.permission-prompt, [data-testid="camera-permission"]').first(),
        manual_input: page.locator('input[placeholder*="ISBN" i], .manual-isbn-input').first(),
        capture_button: page.locator('button:has-text("Capture"), [data-testid="capture-button"]').first()
      };
      
      for (const [component, locator] of Object.entries(scannerComponents)) {
        const isVisible = await locator.isVisible();
        console.log(`Scanner component "${component}": ${isVisible ? 'visible' : 'not visible'}`);
      }
      
      // Test permission handling
      const permissionPrompt = page.locator('.permission-prompt, [data-testid="camera-permission"], button:has-text("Allow Camera")').first();
      
      if (await permissionPrompt.isVisible()) {
        console.log('Camera permission prompt detected');
        await page.screenshot({ 
          path: 'test-results/camera-permission-prompt.png',
          fullPage: true 
        });
      }
      
      // Test manual input fallback
      const manualInputButton = page.locator('button:has-text("Manual"), button:has-text("Enter"), .manual-entry-btn').first();
      
      if (await manualInputButton.isVisible()) {
        await manualInputButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/manual-isbn-entry.png',
          fullPage: true 
        });
      }
    } else {
      console.log('Scanner button not found, checking for direct scanner access');
      
      // Try looking for scanner in different sections
      await page.click('button:has-text("Import")').catch(() => {});
      await page.waitForTimeout(1000);
      
      const importScanner = page.locator('button:has-text("Scan"), .scanner-option').first();
      
      if (await importScanner.isVisible()) {
        await importScanner.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'test-results/import-barcode-scanner.png',
          fullPage: true 
        });
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/scanner-interface-final.png',
      fullPage: true 
    });
  });

  test('should handle camera permissions and access @visual', async ({ page }) => {
    // Mock camera permission APIs for testing
    await page.addInitScript(() => {
      // Mock getUserMedia
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          console.log('Mock getUserMedia called with:', constraints);
          
          // Simulate camera permission scenarios
          if (Math.random() > 0.5) {
            // Simulate permission granted
            return new MediaStream();
          } else {
            // Simulate permission denied
            throw new DOMException('Permission denied', 'NotAllowedError');
          }
        };
      }
      
      // Mock permissions API
      if (navigator.permissions) {
        navigator.permissions.query = async ({ name }) => {
          console.log('Mock permissions query for:', name);
          
          return {
            state: Math.random() > 0.5 ? 'granted' : 'denied',
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        };
      }
    });
    
    // Navigate to scanner
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test camera permission flow
    const scannerAccess = page.locator('button:has-text("Scan"), [data-testid="scanner"], .barcode-scanner').first();
    
    if (await scannerAccess.isVisible()) {
      await scannerAccess.click();
      await page.waitForTimeout(3000);
      
      // Check for permission states
      const permissionStates = {
        granted: page.locator('.permission-granted, .camera-active, video').first(),
        denied: page.locator('.permission-denied, .camera-error').first(),
        prompt: page.locator('.permission-prompt, button:has-text("Allow")').first(),
        not_supported: page.locator('.not-supported, .no-camera-support').first()
      };
      
      for (const [state, locator] of Object.entries(permissionStates)) {
        const isVisible = await locator.isVisible();
        console.log(`Permission state "${state}": ${isVisible ? 'visible' : 'not visible'}`);
      }
      
      await page.screenshot({ 
        path: 'test-results/camera-permissions.png',
        fullPage: true 
      });
    }
    
    // Test fallback to manual input when camera fails
    const manualFallback = page.locator('button:has-text("Manual Entry"), button:has-text("Enter ISBN"), .manual-input').first();
    
    if (await manualFallback.isVisible()) {
      await manualFallback.click();
      await page.waitForTimeout(1000);
      
      const manualInput = page.locator('input[placeholder*="ISBN" i]').first();
      
      if (await manualInput.isVisible()) {
        await manualInput.fill('9780140328721');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/manual-isbn-fallback.png',
          fullPage: true 
        });
      }
    }
  });

  test('should test ISBN lookup after scanning simulation @visual', async ({ page }) => {
    // Navigate to scanner interface
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate scanning workflow
    const testISBNs = [
      '9780140328721',
      '9781421506630',
      '9781542889697',
      '9780134685991'
    ];
    
    console.log('Testing ISBN lookup workflow with test ISBNs:', testISBNs);
    
    // Navigate to a page where we can test ISBN input
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    for (const [index, isbn] of testISBNs.entries()) {
      console.log(`Testing ISBN lookup ${index + 1}/${testISBNs.length}: ${isbn}`);
      
      // Test search by ISBN
      const searchInput = page.locator('input[placeholder*="search" i]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.clear();
        await searchInput.fill(isbn);
        await searchInput.press('Enter');
        
        await page.waitForTimeout(2000);
        
        // Take screenshot of search results
        await page.screenshot({ 
          path: `test-results/isbn-lookup-${index + 1}-${isbn}.png`,
          fullPage: true 
        });
        
        // Check for results
        const searchResults = page.locator('[data-testid="search-results"], .search-results, .results').first();
        const hasResults = await searchResults.isVisible();
        
        console.log(`ISBN ${isbn} search results: ${hasResults ? 'found' : 'not found'}`);
      }
      
      // Test API lookup directly
      const isbnLookupResponse = await page.request.get(`/api/search/isbn/${isbn}?include_external=true`);
      
      if (isbnLookupResponse.ok()) {
        const lookupData = await isbnLookupResponse.json();
        console.log(`ISBN ${isbn} API lookup:`, JSON.stringify({
          success: lookupData.success,
          book_found: !!lookupData.book,
          has_alternatives: lookupData.alternatives?.length > 0
        }, null, 2));
      } else {
        console.log(`ISBN ${isbn} API lookup status:`, isbnLookupResponse.status());
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/isbn-lookup-complete.png',
      fullPage: true 
    });
  });

  test('should test barcode scanner error handling @visual', async ({ page }) => {
    // Test scanner with invalid scenarios
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to access scanner
    const scannerButton = page.locator('button:has-text("Scan"), [data-testid="scanner"]').first();
    
    if (await scannerButton.isVisible()) {
      await scannerButton.click();
      await page.waitForTimeout(2000);
      
      // Test invalid manual inputs
      const manualButton = page.locator('button:has-text("Manual"), .manual-entry').first();
      
      if (await manualButton.isVisible()) {
        await manualButton.click();
        await page.waitForTimeout(500);
        
        const manualInput = page.locator('input[placeholder*="ISBN" i]').first();
        
        if (await manualInput.isVisible()) {
          // Test various invalid inputs
          const invalidInputs = [
            '123',           // Too short
            'abcdefghij',    // Non-numeric
            '9999999999999', // Invalid checksum
            '12345678901234', // Too long
            '',              // Empty
            '123-456-789',   // Invalid format
            '978014032872X'  // Wrong check digit
          ];
          
          for (const [index, input] of invalidInputs.entries()) {
            console.log(`Testing invalid input ${index + 1}: "${input}"`);
            
            await manualInput.clear();
            await manualInput.fill(input);
            await page.keyboard.press('Enter');
            
            await page.waitForTimeout(1000);
            
            // Look for error messages
            const errorMessage = page.locator('.error, .warning, [data-testid="error"], .toast').first();
            const hasError = await errorMessage.isVisible();
            
            console.log(`Invalid input "${input}" showed error: ${hasError}`);
            
            if (index === 0) {
              await page.screenshot({ 
                path: 'test-results/scanner-error-handling.png',
                fullPage: true 
              });
            }
          }
        }
      }
    }
    
    // Test camera not supported scenario
    await page.addInitScript(() => {
      // Remove mediaDevices to simulate unsupported browser
      delete (navigator as any).mediaDevices;
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Try scanner again with no camera support
    const scannerAfterReload = page.locator('button:has-text("Scan")').first();
    
    if (await scannerAfterReload.isVisible()) {
      await scannerAfterReload.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/scanner-no-camera-support.png',
        fullPage: true 
      });
    }
  });

  test('should test touch gestures and mobile interactions', async ({ page }) => {
    // Mobile viewport for touch testing
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to scanner
    const scannerAccess = page.locator('button:has-text("Scan"), [data-testid="scanner"]').first();
    
    if (await scannerAccess.isVisible()) {
      await scannerAccess.tap();
      await page.waitForTimeout(2000);
      
      // Test touch interactions
      const touchTargets = {
        capture_button: page.locator('button:has-text("Capture"), [data-testid="capture"]').first(),
        torch_button: page.locator('button[title*="torch" i], button[title*="flash" i]').first(),
        manual_button: page.locator('button:has-text("Manual")').first(),
        close_button: page.locator('button:has-text("Close"), .close-btn').first()
      };
      
      for (const [name, button] of Object.entries(touchTargets)) {
        if (await button.isVisible()) {
          console.log(`Testing touch interaction: ${name}`);
          
          // Test tap
          await button.tap();
          await page.waitForTimeout(500);
          
          if (name === 'manual_button') {
            // Test manual input on mobile
            const mobileInput = page.locator('input[placeholder*="ISBN" i]').first();
            
            if (await mobileInput.isVisible()) {
              await mobileInput.tap();
              await mobileInput.fill('9780140328721');
              await page.keyboard.press('Enter');
              await page.waitForTimeout(1000);
            }
          }
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/mobile-touch-interactions.png',
        fullPage: true 
      });
      
      // Test swipe gestures if scanner supports them
      const scannerArea = page.locator('video, canvas, .camera-view').first();
      
      if (await scannerArea.isVisible()) {
        // Simulate swipe gesture
        await scannerArea.hover();
        
        // Get element bounds for swipe
        const box = await scannerArea.boundingBox();
        
        if (box) {
          // Swipe from left to right
          await page.mouse.move(box.x + 50, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
          await page.mouse.up();
          
          await page.waitForTimeout(500);
          
          console.log('Tested swipe gesture on scanner area');
        }
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/mobile-scanner-gestures.png',
      fullPage: true 
    });
  });

  test('should test scanner performance and responsiveness @visual', async ({ page }) => {
    // Test scanner performance
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure scanner startup time
    const startTime = Date.now();
    
    const scannerButton = page.locator('button:has-text("Scan")').first();
    
    if (await scannerButton.isVisible()) {
      await scannerButton.click();
      
      // Wait for scanner to initialize
      await page.waitForSelector('video, .camera-view, .scanner-ready', { timeout: 10000 });
      
      const endTime = Date.now();
      const startupTime = endTime - startTime;
      
      console.log(`Scanner startup time: ${startupTime}ms`);
      
      // Test rapid scanning simulation
      const rapidScanStartTime = Date.now();
      
      // Simulate multiple rapid scans
      const testBarcodes = [
        '9780140328721',
        '9781421506630',
        '9781542889697'
      ];
      
      const manualButton = page.locator('button:has-text("Manual")').first();
      
      if (await manualButton.isVisible()) {
        await manualButton.click();
        await page.waitForTimeout(500);
        
        const manualInput = page.locator('input[placeholder*="ISBN" i]').first();
        
        if (await manualInput.isVisible()) {
          for (const barcode of testBarcodes) {
            const scanStart = Date.now();
            
            await manualInput.clear();
            await manualInput.fill(barcode);
            await page.keyboard.press('Enter');
            
            // Wait for processing
            await page.waitForTimeout(200);
            
            const scanEnd = Date.now();
            console.log(`Scan processing time for ${barcode}: ${scanEnd - scanStart}ms`);
          }
        }
      }
      
      const rapidScanEndTime = Date.now();
      const totalRapidScanTime = rapidScanEndTime - rapidScanStartTime;
      
      console.log(`Total rapid scan test time: ${totalRapidScanTime}ms`);
      console.log(`Average scan time: ${totalRapidScanTime / testBarcodes.length}ms`);
      
      await page.screenshot({ 
        path: 'test-results/scanner-performance.png',
        fullPage: true 
      });
    }
    
    // Test memory usage (basic check)
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryInfo) {
      console.log('Scanner memory usage:', JSON.stringify({
        usedJSHeapSize: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
        totalJSHeapSize: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + 'MB'
      }, null, 2));
    }
  });

  test('should test batch scanning functionality @visual', async ({ page }) => {
    // Test batch/continuous scanning mode
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const scannerButton = page.locator('button:has-text("Scan")').first();
    
    if (await scannerButton.isVisible()) {
      await scannerButton.click();
      await page.waitForTimeout(2000);
      
      // Look for batch scanning features
      const batchFeatures = {
        isbn_list: page.locator('.scanned-list, [data-testid="isbn-list"], .batch-list').first(),
        clear_batch: page.locator('button:has-text("Clear"), .clear-batch').first(),
        complete_batch: page.locator('button:has-text("Complete"), button:has-text("Continue"), .finish-batch').first(),
        batch_counter: page.locator('.batch-counter, .scan-count').first()
      };
      
      // Test batch scanning with manual input
      const manualButton = page.locator('button:has-text("Manual")').first();
      
      if (await manualButton.isVisible()) {
        await manualButton.click();
        await page.waitForTimeout(500);
        
        const manualInput = page.locator('input[placeholder*="ISBN" i]').first();
        
        if (await manualInput.isVisible()) {
          // Add multiple ISBNs to batch
          const batchISBNs = [
            '9780140328721',
            '9781421506630',
            '9781542889697',
            '9780134685991'
          ];
          
          for (const [index, isbn] of batchISBNs.entries()) {
            await manualInput.clear();
            await manualInput.fill(isbn);
            await page.keyboard.press('Enter');
            
            await page.waitForTimeout(1000);
            
            console.log(`Added ISBN ${index + 1}/${batchISBNs.length} to batch: ${isbn}`);
            
            // Check batch counter update
            const counter = page.locator('.batch-counter, .scan-count, .total-scanned').first();
            const counterText = await counter.textContent().catch(() => '');
            console.log(`Batch counter: ${counterText}`);
          }
          
          await page.screenshot({ 
            path: 'test-results/batch-scanning-list.png',
            fullPage: true 
          });
          
          // Test removing from batch
          const removeButton = page.locator('button[title*="remove" i], .remove-isbn, button:has(svg)').first();
          
          if (await removeButton.isVisible()) {
            await removeButton.click();
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
              path: 'test-results/batch-remove-item.png',
              fullPage: true 
            });
          }
          
          // Test clear batch
          const clearButton = page.locator('button:has-text("Clear")').first();
          
          if (await clearButton.isVisible()) {
            await clearButton.click();
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
              path: 'test-results/batch-cleared.png',
              fullPage: true 
            });
          }
        }
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/batch-scanning-complete.png',
      fullPage: true 
    });
  });

  test('should test scanner accessibility features @visual', async ({ page }) => {
    // Test scanner accessibility
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Navigate to first focusable element
    
    // Look for scanner access via keyboard
    let foundScanner = false;
    
    for (let i = 0; i < 10; i++) {
      const focused = await page.locator(':focus').textContent().catch(() => '');
      
      if (focused.toLowerCase().includes('scan')) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        foundScanner = true;
        break;
      }
      
      await page.keyboard.press('Tab');
    }
    
    if (foundScanner) {
      console.log('Scanner accessible via keyboard navigation');
      
      // Test keyboard shortcuts in scanner
      await page.keyboard.press('Escape'); // Should close scanner
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'test-results/scanner-keyboard-accessibility.png',
        fullPage: true 
      });
    }
    
    // Test screen reader compatibility
    const scannerButton = page.locator('button:has-text("Scan")').first();
    
    if (await scannerButton.isVisible()) {
      // Check for accessibility attributes
      const ariaLabel = await scannerButton.getAttribute('aria-label');
      const title = await scannerButton.getAttribute('title');
      const role = await scannerButton.getAttribute('role');
      
      console.log('Scanner accessibility attributes:', {
        'aria-label': ariaLabel,
        title: title,
        role: role
      });
      
      await scannerButton.click();
      await page.waitForTimeout(2000);
      
      // Check for screen reader announcements
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const liveRegionCount = await liveRegions.count();
      
      console.log(`Found ${liveRegionCount} live regions for screen reader announcements`);
      
      // Test focus management
      const focusableElements = page.locator('button, input, [tabindex]:not([tabindex="-1"])');
      const focusableCount = await focusableElements.count();
      
      console.log(`Scanner has ${focusableCount} focusable elements`);
      
      await page.screenshot({ 
        path: 'test-results/scanner-accessibility.png',
        fullPage: true 
      });
    }
  });
});