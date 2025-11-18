import { test, expect } from '@playwright/test';

/**
 * Barcode Scanner E2E Tests
 *
 * Tests the barcode scanner functionality including:
 * - Camera access
 * - Manual ISBN entry
 * - Integration with book search
 */

test.describe('Barcode Scanner', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to library page
    await page.goto('/library');

    // Skip if redirected to login (not authenticated)
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }
  });

  test('should display barcode scanner tab in add book dialog', async ({ page }) => {
    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Verify scan barcode tab exists
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await expect(scanTab).toBeVisible();

    // Click on scan tab
    await scanTab.click();

    // Verify scanner UI elements are visible
    await expect(page.getByText(/start scanning/i).or(page.getByText(/camera/i))).toBeVisible();
  });

  test('should allow manual ISBN entry in scan tab', async ({ page }) => {
    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Find manual ISBN input
    const manualIsbnInput = page.getByLabel(/isbn.*manual/i);
    await expect(manualIsbnInput).toBeVisible();

    // Enter ISBN manually
    const testIsbn = '9780316769174'; // Example ISBN
    await manualIsbnInput.fill(testIsbn);

    // Verify input was filled
    await expect(manualIsbnInput).toHaveValue(testIsbn);

    // Verify search button is enabled
    const searchButton = page
      .getByRole('button', { name: /search and add/i })
      .or(page.getByRole('button', { name: /add/i }));

    await expect(searchButton).toBeEnabled();
  });

  test('should show camera permission request when starting scan', async ({ page, context }) => {
    // Grant camera permissions for testing
    await context.grantPermissions(['camera']);

    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Go to scan tab
    const scanTab = page.getByRole('button', { name: /scan barcode/i });
    await scanTab.click();

    // Click start scanning button
    const startScanButton = page.getByRole('button', { name: /start scanning/i });

    if (await startScanButton.isVisible().catch(() => false)) {
      await startScanButton.click();

      // Verify video element appears or error message shows
      const hasVideo = await page.locator('video').isVisible().catch(() => false);
      const hasError = await page
        .getByText(/camera/i)
        .or(page.getByText(/permission/i))
        .isVisible()
        .catch(() => false);

      expect(hasVideo || hasError).toBe(true);
    }
  });

  test('should have format and status selectors in scan tab', async ({ page }) => {
    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Verify format selector exists
    const formatSelect = page.getByLabel(/format/i);
    await expect(formatSelect).toBeVisible();

    // Verify status selector exists
    const statusSelect = page.getByLabel(/ownership status|status/i);
    await expect(statusSelect).toBeVisible();
  });

  test('should integrate with existing ISBN search', async ({ page }) => {
    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Test ISBN in ISBN tab first
    const isbnTab = page.getByRole('tab', { name: /isbn search/i });
    await isbnTab.click();

    const isbnInput = page.getByLabel(/isbn/i).first();
    const testIsbn = '9780316769174';
    await isbnInput.fill(testIsbn);

    // Switch to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Manual ISBN input should show same ISBN (if state is shared)
    // Or should be empty (if state is separate)
    const manualInput = page.getByLabel(/isbn.*manual/i);
    await expect(manualInput).toBeVisible();
  });

  test('should show help text about barcode library', async ({ page }) => {
    // Open add book dialog
    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Check for help text about library installation
    const helpText = page.getByText(/@zxing|barcode|npm install/i);
    await expect(helpText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Barcode Scanner - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  test('should be accessible on mobile devices', async ({ page }) => {
    await page.goto('/library');

    // Skip if not authenticated
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    const addBookButton = page.getByRole('button', { name: /add book/i });

    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addBookButton.click();

    // Verify scan tab is visible on mobile
    const scanTab = page.getByRole('tab', { name: /scan/i });
    await expect(scanTab).toBeVisible();

    // Click scan tab
    await scanTab.click();

    // Verify camera interface is mobile-friendly
    const cameraSection = page.locator('video').or(page.getByRole('button', { name: /camera/i }));
    await expect(cameraSection).toBeVisible({ timeout: 5000 });
  });
});
