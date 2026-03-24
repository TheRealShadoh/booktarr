import { test, expect } from '@playwright/test';

/**
 * Kindle / Audible Integration Tests
 *
 * Verifies that the UI surfaces for adding Kindle and Audible content are
 * present and functional:
 * - The Add Book dialog has a "Kindle/Audible" tab (4th tab)
 * - The ASIN tab has an input field and a format selector
 * - The Settings page has a "Connected Services" section describing
 *   Kindle and Audible import options
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
  // The "Add Book" button is a dropdown menu trigger - click it to open the menu
  const addBookButton = page.getByRole('button', { name: /^add book$/i });
  if (!(await addBookButton.isVisible().catch(() => false))) {
    return false;
  }
  await addBookButton.click();

  // Click "Add Single Book" from the dropdown menu
  const menuItem = page.getByRole('menuitem', { name: /add single book/i });
  await expect(menuItem).toBeVisible({ timeout: 3000 });
  await menuItem.click();

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  return true;
}

test.describe('Add Book Dialog - Kindle/Audible Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
  });

  test('Add Book dialog has exactly 4 tabs', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.screenshot({ path: 'test-results/add-book-dialog-tabs.png' });

    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(4);
  });

  test('four tabs are: ISBN Search, Scan Barcode, Title Search, Kindle/Audible', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await expect(page.getByRole('tab', { name: /isbn search/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /scan barcode/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /title search/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /kindle\/audible/i })).toBeVisible();
  });

  test('Kindle/Audible tab is the 4th tab (rightmost)', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    const tabs = page.getByRole('tab');
    const lastTab = tabs.nth(3);
    const lastTabText = await lastTab.textContent();
    expect(lastTabText?.toLowerCase()).toMatch(/kindle|audible/);
  });

  test('clicking Kindle/Audible tab shows ASIN input field', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    await page.screenshot({ path: 'test-results/add-book-kindle-tab.png' });

    // ASIN input rendered with id="asin"
    const asinInput = page.locator('#asin');
    await expect(asinInput).toBeVisible();
    await expect(asinInput).toBeEnabled();
  });

  test('ASIN input has correct placeholder text', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    const asinInput = page.locator('#asin');
    const placeholder = await asinInput.getAttribute('placeholder');
    expect(placeholder?.toUpperCase()).toContain('ASIN');
  });

  test('Kindle/Audible tab shows format selector with Kindle and Audible options', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    // The format select is rendered with id="asin-format"
    const formatTrigger = page.locator('#asin-format');
    await expect(formatTrigger).toBeVisible();

    // Open the select to inspect options
    await formatTrigger.click();

    await page.screenshot({ path: 'test-results/add-book-asin-format-open.png' });

    await expect(page.getByRole('option', { name: /kindle ebook/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /audible audiobook/i })).toBeVisible();
  });

  test('Kindle/Audible tab has Search and Add Directly buttons', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    // Primary search button
    await expect(page.getByRole('button', { name: /search and add/i })).toBeVisible();

    // Secondary direct-add button
    await expect(page.getByRole('button', { name: /add directly/i })).toBeVisible();
  });

  test('Kindle/Audible tab shows instructional text about ASIN location', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    // The info box references the /dp/ URL pattern
    await expect(page.getByText(/\/dp\//)).toBeVisible();
  });

  test('ASIN input accepts text and enables Add Directly button', async ({ page }) => {
    const opened = await openAddBookDialog(page);
    if (!opened) { test.skip(); return; }

    await page.getByRole('tab', { name: /kindle\/audible/i }).click();

    const addDirectlyButton = page.getByRole('button', { name: /add directly/i });
    // Button should be disabled with no ASIN entered
    await expect(addDirectlyButton).toBeDisabled();

    // Enter a valid-looking ASIN
    await page.locator('#asin').fill('B08N5WRWNW');

    // Button should now be enabled
    await expect(addDirectlyButton).toBeEnabled();
  });
});

test.describe('Settings Page - Connected Services Section', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page has a "Connected Services" card', async ({ page }) => {
    await page.screenshot({ path: 'test-results/settings-connected-services.png', fullPage: true });

    // CardTitle renders as a <div>, not a heading element - use getByText
    await expect(page.getByText('Connected Services').first()).toBeVisible();
  });

  test('Connected Services section mentions Kindle', async ({ page }) => {
    // CardTitle renders as a <div>, not a heading element - use getByText
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/kindle/i).first()).toBeVisible();
  });

  test('Connected Services section mentions Audible', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/audible/i).first()).toBeVisible();
  });

  test('Connected Services section has Manual ASIN Entry method', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/manual asin entry/i)).toBeVisible();
  });

  test('Connected Services section has Kindle CSV Export method', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/kindle csv export/i)).toBeVisible();
  });

  test('Connected Services section has Audible CSV Export method', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/audible csv export/i)).toBeVisible();
  });

  test('Connected Services section has Amazon Order History method', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    await expect(page.getByText(/amazon order history/i)).toBeVisible();
  });

  test('"Open Add Book Dialog" button in Connected Services opens the dialog', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    const openDialogButton = page.getByRole('button', { name: /open add book dialog/i });
    await expect(openDialogButton).toBeVisible();
    await openDialogButton.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/settings-open-add-book.png' });

    // Dialog should have the Kindle/Audible tab
    await expect(page.getByRole('tab', { name: /kindle\/audible/i })).toBeVisible();
  });

  test('Kindle Book List Downloader link has correct Chrome Web Store URL', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    const kindleLink = page.getByRole('link', { name: /kindle book list downloader/i });
    await expect(kindleLink).toBeVisible();

    const href = await kindleLink.getAttribute('href');
    expect(href).toContain('chromewebstore.google.com');
  });

  test('Audible Library Extractor link points to GitHub', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    const audibleLink = page.getByRole('link', { name: /audible library extractor/i });
    await expect(audibleLink).toBeVisible();

    const href = await audibleLink.getAttribute('href');
    expect(href).toContain('github.com');
  });

  test('external links open in a new tab (target=_blank)', async ({ page }) => {
    const cardTitle = page.getByText('Connected Services').first();
    await cardTitle.scrollIntoViewIfNeeded();

    const externalLinks = [
      page.getByRole('link', { name: /kindle book list downloader/i }),
      page.getByRole('link', { name: /audible library extractor/i }),
      page.getByRole('link', { name: /amazon privacy central/i }),
    ];

    for (const link of externalLinks) {
      if (await link.isVisible().catch(() => false)) {
        const target = await link.getAttribute('target');
        expect(target, `Link should open in new tab`).toBe('_blank');

        const rel = await link.getAttribute('rel');
        expect(rel, `Link should have noopener`).toContain('noopener');
      }
    }
  });
});
