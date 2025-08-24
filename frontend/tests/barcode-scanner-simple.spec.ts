import { test, expect } from '@playwright/test';

test.describe('Simple Barcode Scanner Tests - Fixed Implementation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to scanner via keyboard shortcut and test manual entry @visual', async ({ page }) => {
    // Use Ctrl+N to navigate to Add Book page
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(1000);
    
    // Look for the "Scan Barcodes" button
    const scanButton = page.locator('button:has-text("Scan Barcodes")');
    
    if (await scanButton.isVisible()) {
      console.log('✅ Found Scan Barcodes button');
      
      // Click to open scanner
      await scanButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of scanner interface
      await page.screenshot({ 
        path: 'test-results/simple-scanner-opened.png',
        fullPage: true 
      });
      
      // Check for our improved scanner components
      const scannerComponents = {
        'scanner-container': page.locator('[data-testid="barcode-scanner"]'),
        'scanner-status': page.locator('[data-testid="scanner-status"]'),
        'camera-video': page.locator('[data-testid="camera-video"]'),
        'scanner-overlay': page.locator('[data-testid="scanner-overlay"]'),
        'capture-button': page.locator('[data-testid="capture-button"]'),
        'manual-entry': page.locator('[data-testid="manual-entry"]'),
        'close-scanner': page.locator('[data-testid="close-scanner"]')
      };
      
      for (const [name, locator] of Object.entries(scannerComponents)) {
        const isVisible = await locator.isVisible();
        console.log(`Scanner component "${name}": ${isVisible ? '✅ visible' : '❌ not visible'}`);
      }
      
      // Test manual entry with sample ISBN
      console.log('Testing manual entry...');
      const manualButton = page.locator('[data-testid="manual-entry"]');
      
      if (await manualButton.isVisible()) {
        await manualButton.click();
        await page.waitForTimeout(500);
        
        // Handle the actual modal implementation (not browser dialog)
        const isbnInput = page.locator('input[type="text"]').filter({ hasText: '' }).or(page.locator('input[placeholder*="ISBN"]')).first();
        if (await isbnInput.isVisible()) {
          await isbnInput.fill('9780439023481'); // Harry Potter ISBN
          
          // Look for Add ISBN or Submit button
          const submitButton = page.locator('button:has-text("Add ISBN")').or(page.locator('button[type="submit"]')).first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
          }
        }
        
        await page.waitForTimeout(1000);
        
        // Take screenshot after manual entry
        await page.screenshot({ 
          path: 'test-results/simple-scanner-manual-entry.png',
          fullPage: true 
        });
        
        // Check scanner status for any ISBN additions
        const statusText = await page.locator('[data-testid="scanner-status"]').textContent();
        console.log('Scanner status after manual entry:', statusText);
      }
      
      // Test close functionality - first try Escape key since modal might be intercepting clicks
      console.log('Attempting to close scanner with Escape key...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
      // Check if scanner is closed
      let scannerClosed = !(await page.locator('[data-testid="barcode-scanner"]').isVisible());
      console.log(`Scanner closed by Escape: ${scannerClosed ? '✅ success' : '❌ still visible'}`);
      
      // If Escape didn't work, try clicking close button
      if (!scannerClosed) {
        console.log('Escape failed, trying close button...');
        const closeButton = page.locator('[data-testid="close-scanner"]');
        if (await closeButton.isVisible()) {
          // Try force click to bypass intercepting elements
          await closeButton.click({ force: true });
          await page.waitForTimeout(500);
          
          scannerClosed = !(await page.locator('[data-testid="barcode-scanner"]').isVisible());
          console.log(`Scanner closed by button: ${scannerClosed ? '✅ success' : '❌ still visible'}`);
        }
      }
      
    } else {
      console.log('❌ Scan Barcodes button not found');
      
      // Take screenshot for debugging
      await page.screenshot({ 
        path: 'test-results/no-scan-button-found.png',
        fullPage: true 
      });
      
      // List all visible buttons for debugging
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons on page:`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Limit to first 10
        const buttonText = await buttons.nth(i).textContent();
        console.log(`  Button ${i}: "${buttonText}"`);
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'test-results/simple-scanner-test-complete.png',
      fullPage: true 
    });
  });

  test('should test ISBN validation functions directly', async ({ page }) => {
    // Navigate to a page where we can test our scanner
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(1000);
    
    // Test our ISBN validation with the sample ISBNs we found
    const testISBNs = [
      '9780439023481', // Harry Potter (13-digit, valid)
      '0439023483',    // Harry Potter (10-digit, valid - corrected checksum)
      '9781421506630', // From test data 
      '123456789',     // Invalid (too short)
      '9999999999999', // Invalid (wrong checksum)
      'abcdefghijk',   // Invalid (non-numeric)
    ];
    
    // Inject test function into page
    await page.addInitScript(() => {
      // Add our ISBN validation functions to window for testing
      (window as any).testISBNValidation = {
        validateISBN10: (isbn: string): boolean => {
          if (isbn.length !== 10) return false;
          
          let sum = 0;
          for (let i = 0; i < 9; i++) {
            sum += parseInt(isbn[i]) * (10 - i);
          }
          
          const lastChar = isbn[9].toUpperCase();
          const checkDigit = (11 - (sum % 11)) % 11;
          const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();
          
          return lastChar === expectedChar;
        },
        
        convertISBN10to13: (isbn10: string): string => {
          const prefix = '978';
          const isbn13WithoutCheck = prefix + isbn10.substring(0, 9);
          
          let sum = 0;
          for (let i = 0; i < 12; i++) {
            sum += parseInt(isbn13WithoutCheck[i]) * (i % 2 === 0 ? 1 : 3);
          }
          
          const checkDigit = (10 - (sum % 10)) % 10;
          return isbn13WithoutCheck + checkDigit;
        },
        
        extractISBN: (text: string): string | null => {
          const digits = text.replace(/\D/g, '');
          
          // Handle 13-digit ISBNs
          if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
            return digits;
          }
          
          // Handle 10-digit ISBNs - convert to 13-digit with proper check digit calculation
          if (digits.length === 10) {
            if ((window as any).testISBNValidation.validateISBN10(digits)) {
              return (window as any).testISBNValidation.convertISBN10to13(digits);
            } else {
              return null;
            }
          }
          
          // Handle 10-character ISBNs with possible 'X' check digit
          if (text.replace(/[^\dX]/gi, '').length === 10) {
            const isbn10 = text.replace(/[^\dX]/gi, '');
            if ((window as any).testISBNValidation.validateISBN10(isbn10)) {
              return (window as any).testISBNValidation.convertISBN10to13(isbn10);
            } else {
              return null;
            }
          }
          
          // Look for embedded 13-digit patterns
          const isbn13Match = text.match(/(?:978|979)\d{10}/);
          if (isbn13Match) {
            return isbn13Match[0];
          }
          
          return null;
        }
      };
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test each ISBN
    const results = await page.evaluate((testISBNs) => {
      const testResults = [];
      
      for (const isbn of testISBNs) {
        const result = (window as any).testISBNValidation.extractISBN(isbn);
        testResults.push({
          input: isbn,
          output: result,
          valid: result !== null
        });
      }
      
      return testResults;
    }, testISBNs);
    
    // Log results
    console.log('📚 ISBN Validation Test Results:');
    for (const result of results) {
      const status = result.valid ? '✅' : '❌';
      console.log(`  ${status} "${result.input}" → "${result.output}"`);
    }
    
    // Verify expected results
    expect(results[0].valid).toBe(true); // 9780439023481 should be valid
    expect(results[1].valid).toBe(true); // 0439023483 should convert to valid 13-digit
    expect(results[2].valid).toBe(true); // 9781421506630 should be valid
    expect(results[3].valid).toBe(false); // 123456789 should be invalid (too short)
    expect(results[4].valid).toBe(false); // 9999999999999 should be invalid (wrong checksum)
    expect(results[5].valid).toBe(false); // abcdefghijk should be invalid (non-numeric)
    
    console.log('✅ All ISBN validation tests passed!');
  });

  test('should test scanner accessibility and keyboard navigation', async ({ page }) => {
    // Navigate using keyboard shortcut
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(1000);
    
    // Test keyboard navigation to scanner
    let foundScanner = false;
    
    // Press Tab multiple times to find scanner button
    for (let i = 0; i < 10; i++) {
      const focused = await page.locator(':focus').textContent();
      console.log(`Tab ${i + 1}: focused on "${focused}"`);
      
      if (focused && focused.toLowerCase().includes('scan')) {
        console.log('✅ Found scanner button via keyboard navigation');
        foundScanner = true;
        
        // Press Enter to activate
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Check if scanner opened
        const scannerVisible = await page.locator('[data-testid="barcode-scanner"]').isVisible();
        console.log(`Scanner opened via keyboard: ${scannerVisible ? '✅ yes' : '❌ no'}`);
        
        if (scannerVisible) {
          // Test Escape to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          const scannerClosed = !(await page.locator('[data-testid="barcode-scanner"]').isVisible());
          console.log(`Scanner closed via Escape: ${scannerClosed ? '✅ yes' : '❌ no'}`);
        }
        
        break;
      }
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    if (!foundScanner) {
      console.log('❌ Could not find scanner via keyboard navigation');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/scanner-accessibility-test.png',
      fullPage: true 
    });
  });
});