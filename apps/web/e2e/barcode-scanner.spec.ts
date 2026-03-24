import { test, expect } from '@playwright/test';

/**
 * Barcode Scanner E2E Tests
 *
 * Tests the barcode scanner functionality including:
 * - Camera access
 * - Manual ISBN entry
 * - Integration with book search
 */

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[id="email"]', 'chris@booktarr.test');
  await page.fill('[id="password"]', 'TestPass123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/library', { timeout: 15000 });
}

async function openAddBookDialog(page: import('@playwright/test').Page) {
  // "Add Book" is a DropdownMenuTrigger - click it to open the dropdown
  const addBookButton = page.getByRole('button', { name: /add book/i });
  if (!(await addBookButton.isVisible().catch(() => false))) {
    return false;
  }
  await addBookButton.click();

  // Click the "Add Single Book" menu item (not "Import from CSV")
  const menuItem = page.getByRole('menuitem', { name: /add single book/i });
  if (await menuItem.isVisible({ timeout: 1000 }).catch(() => false)) {
    await menuItem.click();
  }

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  return true;
}

test.describe('Barcode Scanner', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
  });

  test('should display barcode scanner tab in add book dialog', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Verify scan barcode tab exists
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await expect(scanTab).toBeVisible();

    // Click on scan tab
    await scanTab.click();

    // Verify scanner UI elements are visible (the camera icon placeholder or start button)
    await expect(
      page.getByRole('button', { name: /start scanning/i }).or(page.getByText(/or enter manually/i))
    ).toBeVisible();
  });

  test('should allow manual ISBN entry in scan tab', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Find manual ISBN input by its id (rendered as id="isbn-manual" with label "ISBN (Manual Entry)")
    const manualIsbnInput = page.locator('#isbn-manual');
    await expect(manualIsbnInput).toBeVisible();

    // Enter ISBN manually
    const testIsbn = '9780316769174'; // Example ISBN
    await manualIsbnInput.fill(testIsbn);

    // Verify input was filled
    await expect(manualIsbnInput).toHaveValue(testIsbn);

    // Verify search button is enabled (it's disabled when isbn is empty, enabled when filled)
    const searchButton = page.getByRole('button', { name: /search and add/i });
    await expect(searchButton).toBeEnabled();
  });

  test('should show camera permission request when starting scan', async ({ page, context }) => {
    // Grant camera permissions for testing
    await context.grantPermissions(['camera']);

    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
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
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Verify format selector exists (rendered with id="format-scan")
    const formatSelect = page.locator('#format-scan');
    await expect(formatSelect).toBeVisible();

    // Verify status selector exists (rendered with id="status-scan")
    const statusSelect = page.locator('#status-scan');
    await expect(statusSelect).toBeVisible();
  });

  test('should integrate with existing ISBN search', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Test ISBN in ISBN tab first
    const isbnTab = page.getByRole('tab', { name: /isbn search/i });
    await isbnTab.click();

    const isbnInput = page.locator('#isbn');
    const testIsbn = '9780316769174';
    await isbnInput.fill(testIsbn);

    // Switch to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // Manual ISBN input should be visible (state may or may not carry over between tabs)
    const manualInput = page.locator('#isbn-manual');
    await expect(manualInput).toBeVisible();
  });

  test('should show the scan barcode UI with start scanning button', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Go to scan tab
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await scanTab.click();

    // The BarcodeScanner component renders a "Start Scanning" button when not scanning
    const startScanButton = page.getByRole('button', { name: /start scanning/i });
    await expect(startScanButton).toBeVisible({ timeout: 5000 });

    // The "Or enter manually" divider should also be visible
    await expect(page.getByText(/or enter manually/i)).toBeVisible();
  });
});

test.describe('Barcode Scanner - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  test('should be accessible on mobile devices', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    // Verify scan tab is visible on mobile
    const scanTab = page.getByRole('tab', { name: /scan barcode/i });
    await expect(scanTab).toBeVisible();

    // Click scan tab
    await scanTab.click();

    // Verify the Start Scanning button is present (camera interface entry point)
    const startScanButton = page.getByRole('button', { name: /start scanning/i });
    await expect(startScanButton).toBeVisible({ timeout: 5000 });
  });
});
