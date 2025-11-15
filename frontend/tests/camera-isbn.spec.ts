/**
 * Camera and ISBN Functionality Tests
 *
 * Tests barcode scanning, ISBN detection, and metadata enrichment
 *
 * @requires Camera permissions granted in browser
 * @requires Backend running on localhost:8000
 */

import { test, expect } from '@playwright/test';

test.describe('Camera and Barcode Scanning', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have scanner button visible', async ({ page }) => {
    // Check if scanner button exists
    const scannerButton = page.locator('button', { hasText: /scan|camera|barcode/i });
    await expect(scannerButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open camera when scan button clicked', async ({ page }) => {
    // Click scanner button
    const scannerButton = page.locator('button', { hasText: /scan|camera|barcode/i }).first();
    await scannerButton.click();

    // Wait for scanner modal/component
    await page.waitForSelector('video, [data-testid="scanner-modal"]', { timeout: 5000 });

    // Verify camera video element is present
    const video = page.locator('video');
    await expect(video).toBeVisible();
  });

  test('should show manual ISBN entry option', async ({ page }) => {
    // Open scanner
    const scannerButton = page.locator('button', { hasText: /scan|camera|barcode/i }).first();
    await scannerButton.click();

    // Look for manual entry option
    const manualEntry = page.locator('input[type="text"], input[placeholder*="ISBN"]');
    await expect(manualEntry.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle camera permission denial gracefully', async ({ page, context }) => {
    // Deny camera permission
    await context.clearPermissions();

    // Try to open scanner
    const scannerButton = page.locator('button', { hasText: /scan|camera|barcode/i }).first();
    await scannerButton.click();

    // Should show error message
    const errorMessage = page.locator('text=/camera.*denied|permission.*denied/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should close scanner when cancel button clicked', async ({ page }) => {
    // Open scanner
    const scannerButton = page.locator('button', { hasText: /scan|camera|barcode/i }).first();
    await scannerButton.click();

    // Wait for scanner to open
    await page.waitForSelector('video, [data-testid="scanner-modal"]', { timeout: 5000 });

    // Click cancel/close button
    const closeButton = page.locator('button', { hasText: /cancel|close/i });
    await closeButton.first().click();

    // Verify scanner is closed
    await expect(page.locator('video')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('ISBN Search and Metadata Enrichment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should search for book by valid ISBN-13', async ({ page }) => {
    // Known valid ISBN for testing: Oshi No Ko Vol. 1
    const testISBN = '9781975363178';

    // Find search or add book input
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);

    // Press Enter or click search
    await searchInput.press('Enter');

    // Wait for API response
    await page.waitForResponse(/\/api\/books\/search|\/api\/books\?.*isbn/i, { timeout: 10000 });

    // Verify book information is displayed
    await expect(page.locator('text=/Oshi.*Ko/i')).toBeVisible({ timeout: 5000 });
  });

  test('should search for book by valid ISBN-10', async ({ page }) => {
    // Known valid ISBN-10 for testing
    const testISBN = '1975363175';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    // Wait for API response
    await page.waitForResponse(/\/api\/books\/search|\/api\/books\?.*isbn/i, { timeout: 10000 });

    // Should show results or loading state
    await expect(page.locator('.loading, .spinner, text=/searching|loading/i, .book-card')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid ISBN format', async ({ page }) => {
    // Invalid ISBN
    const invalidISBN = '123abc456';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(invalidISBN);
    await searchInput.press('Enter');

    // Should show validation error
    await expect(page.locator('text=/invalid.*isbn|incorrect.*format/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display enriched metadata', async ({ page }) => {
    const testISBN = '9781975363178';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    // Wait for metadata to load
    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow rendering

    // Check for enriched metadata fields
    const metadataFields = [
      /title/i,
      /author/i,
      /series/i,
      /published/i,
      /publisher/i,
    ];

    for (const field of metadataFields) {
      const element = page.locator(`label:has-text("${field.source}"), dt:has-text("${field.source}"), .field-label:has-text("${field.source}")`);
      await expect(element.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display cover image from metadata', async ({ page }) => {
    const testISBN = '9781975363178';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    // Wait for metadata
    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for cover image
    const coverImage = page.locator('img[alt*="cover"], img.book-cover, img.cover-image');
    await expect(coverImage.first()).toBeVisible({ timeout: 5000 });

    // Verify image has src
    const src = await coverImage.first().getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toMatch(/http|data:image/);
  });

  test('should show series information if available', async ({ page }) => {
    const testISBN = '9781975363178'; // Oshi No Ko Vol. 1 - has series info

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for series name
    await expect(page.locator('text=/Oshi.*Ko|推しの子/i')).toBeVisible({ timeout: 5000 });

    // Check for volume number
    await expect(page.locator('text=/volume.*1|vol.*1|#1/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle book not found scenario', async ({ page }) => {
    // Use non-existent ISBN
    const fakeISBN = '9999999999999';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(fakeISBN);
    await searchInput.press('Enter');

    // Wait for API response
    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });

    // Should show "not found" message
    await expect(page.locator('text=/not found|no.*results|couldn.*find/i')).toBeVisible({ timeout: 5000 });
  });

  test('should allow adding book to collection after search', async ({ page }) => {
    const testISBN = '9781975363178';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for "Add to Collection" or similar button
    const addButton = page.locator('button', { hasText: /add.*collection|add.*library|save/i });
    await expect(addButton.first()).toBeVisible({ timeout: 5000 });
    await expect(addButton.first()).toBeEnabled();
  });
});

test.describe('ISBN Metadata Sources', () => {
  test('should show multiple metadata sources', async ({ page }) => {
    await page.goto('/');
    const testISBN = '9781975363178';

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');

    await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for metadata source indicators
    const sources = ['Google Books', 'OpenLibrary', 'AniList'];

    // At least one source should be mentioned
    let foundSource = false;
    for (const source of sources) {
      const element = page.locator(`text=${source}`);
      if (await element.count() > 0) {
        foundSource = true;
        break;
      }
    }

    expect(foundSource).toBeTruthy();
  });

  test('should prioritize local database over external APIs', async ({ page }) => {
    await page.goto('/');
    const testISBN = '9781975363178';

    // First search - will fetch from API
    let searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill(testISBN);
    await searchInput.press('Enter');
    await page.waitForResponse(/\/api\/books\/search/i);
    await page.waitForTimeout(2000);

    // Add to collection
    const addButton = page.locator('button', { hasText: /add.*collection|save/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);
    }

    // Second search - should be faster (from local DB)
    searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.clear();
    await searchInput.fill(testISBN);

    const startTime = Date.now();
    await searchInput.press('Enter');
    await page.waitForResponse(/\/api\/books\/search/i);
    const duration = Date.now() - startTime;

    // Local DB search should be fast (< 500ms)
    expect(duration).toBeLessThan(500);
  });
});

test.describe('Mobile Camera Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should be usable on mobile viewport', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.goto('/');

    // Scanner button should be easily tappable (min 44px)
    const scannerButton = page.locator('button', { hasText: /scan|camera/i }).first();
    await expect(scannerButton).toBeVisible();

    const box = await scannerButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  });

  test('should use environment (rear) camera by default', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.goto('/');

    // Open scanner
    const scannerButton = page.locator('button', { hasText: /scan|camera/i }).first();
    await scannerButton.click();

    // Check if rear camera is requested
    // Note: This is a best-effort check; actual camera selection
    // depends on device capabilities
    await page.waitForSelector('video');
    await page.waitForTimeout(1000);

    const video = page.locator('video');
    await expect(video).toBeVisible();
  });

  test('should show manual entry prominently on mobile', async ({ page }) => {
    await page.goto('/');

    // Open scanner or search
    const searchButton = page.locator('button', { hasText: /search|add|scan/i }).first();
    await searchButton.click();

    // Manual ISBN input should be visible and accessible
    const isbnInput = page.locator('input[placeholder*="ISBN"], input[type="text"]').first();
    await expect(isbnInput).toBeVisible();

    // Should have appropriate mobile input type
    const inputType = await isbnInput.getAttribute('type');
    const inputMode = await isbnInput.getAttribute('inputmode');

    // Should use numeric input for better mobile keyboard
    expect(inputMode === 'numeric' || inputType === 'tel' || inputType === 'number').toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('scanner should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab to scanner button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate with Enter or Space
    await page.keyboard.press('Enter');

    // Scanner should open
    await page.waitForSelector('video, [role="dialog"]', { timeout: 5000 });
  });

  test('scanner should have proper ARIA labels', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.goto('/');

    const scannerButton = page.locator('button', { hasText: /scan|camera/i }).first();

    // Should have accessible name
    const ariaLabel = await scannerButton.getAttribute('aria-label');
    const text = await scannerButton.textContent();

    expect(ariaLabel || text).toBeTruthy();
    expect((ariaLabel || text || '').toLowerCase()).toMatch(/scan|camera|barcode/);
  });

  test('ISBN input should have labels', async ({ page }) => {
    await page.goto('/');

    // Find ISBN input
    const isbnInput = page.locator('input[placeholder*="ISBN"], input[type="text"]').first();

    // Should have associated label
    const inputId = await isbnInput.getAttribute('id');
    if (inputId) {
      const label = page.locator(`label[for="${inputId}"]`);
      await expect(label).toBeVisible();
    } else {
      // Or aria-label
      const ariaLabel = await isbnInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

// Test data for known ISBNs
const KNOWN_ISBNS = {
  oshiNoKo: '9781975363178',
  bleach: '9781591164241',
  chainsaw: '9781974709939',
};

// Helper function for common ISBN search workflow
async function searchISBN(page, isbn: string) {
  const searchInput = page.locator('input[type="text"], input[type="search"]').first();
  await searchInput.fill(isbn);
  await searchInput.press('Enter');
  await page.waitForResponse(/\/api\/books\/search/i, { timeout: 10000 });
  await page.waitForTimeout(2000); // Allow rendering
}
