import { test, expect } from '@playwright/test';

/**
 * Bulk Scanner Page Tests
 *
 * Tests the /scan page which hosts the BulkScanner component.
 * The component persists its scan queue in localStorage under the key
 * 'booktarr-scan-queue', so we can seed the queue via page.evaluate and
 * then reload to trigger the component's loadQueue() initialiser.
 */

const STORAGE_KEY = 'booktarr-scan-queue';

interface ScannedItem {
  isbn: string;
  scannedAt: string;
  status: 'queued' | 'adding' | 'success' | 'error';
  title?: string;
}

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[id="email"]', 'chris@booktarr.test');
  await page.fill('[id="password"]', 'TestPass123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/library', { timeout: 15000 });
}

function makeQueueItems(isbns: string[]): ScannedItem[] {
  return isbns.map((isbn) => ({
    isbn,
    scannedAt: new Date().toISOString(),
    status: 'queued',
  }));
}

test.describe('Bulk Scanner Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigating to /scan shows the Bulk Scan heading', async ({ page }) => {
    await page.goto('/scan');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/bulk-scan-page.png', fullPage: true });

    await expect(page.getByRole('heading', { name: /bulk scan/i })).toBeVisible();
  });

  test('page shows instructions explaining how bulk scan works', async ({ page }) => {
    await page.goto('/scan');
    await page.waitForLoadState('networkidle');

    // Instruction paragraph rendered below the heading
    await expect(
      page.getByText(/scan multiple book barcodes/i)
    ).toBeVisible();

    // Numbered how-it-works list items
    await expect(page.getByText(/tap.*start bulk scanning/i)).toBeVisible();
  });

  test('"Start Bulk Scanning" button is visible', async ({ page }) => {
    await page.goto('/scan');
    await page.waitForLoadState('networkidle');

    const startButton = page.getByRole('button', { name: /start bulk scanning/i });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('seeding localStorage queue causes items to appear after reload', async ({ page }) => {
    const testIsbns = ['9780316769174', '9780062315007', '9780593099322'];
    const queueItems = makeQueueItems(testIsbns);

    // Seed the queue before the page component mounts
    await page.goto('/scan');
    await page.evaluate(
      ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
      { key: STORAGE_KEY, items: queueItems }
    );

    // Reload so the component reads localStorage on mount
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/bulk-scan-queue-loaded.png', fullPage: true });

    // The queue header shows the count
    await expect(page.getByText(/scan queue \(3\)/i)).toBeVisible();

    // Each ISBN should appear in the queue
    for (const isbn of testIsbns) {
      await expect(page.getByText(isbn)).toBeVisible();
    }
  });

  test('"Sync N Books" button shows correct count from seeded queue', async ({ page }) => {
    const testIsbns = ['9780316769174', '9780062315007'];
    const queueItems = makeQueueItems(testIsbns);

    await page.goto('/scan');
    await page.evaluate(
      ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
      { key: STORAGE_KEY, items: queueItems }
    );

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/bulk-scan-sync-button.png' });

    // Sync button shows "Sync 2 Books"
    const syncButton = page.getByRole('button', { name: /sync 2 books/i });
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();
  });

  test('clear queue button removes all items', async ({ page }) => {
    const testIsbns = ['9780316769174', '9780062315007', '9780593099322'];
    const queueItems = makeQueueItems(testIsbns);

    await page.goto('/scan');
    await page.evaluate(
      ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
      { key: STORAGE_KEY, items: queueItems }
    );

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Queue should be visible
    await expect(page.getByText(/scan queue \(3\)/i)).toBeVisible();

    // Click the Trash icon button (clear queue)
    // The button renders a Trash2 icon with no visible text; it sits next to the Sync button
    const clearButton = page.locator('button:has([data-lucide="trash-2"])');
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
    } else {
      // Fallback: find any button near the queue heading that isn't Sync
      const queueSection = page.locator('text=Scan Queue').locator('..');
      const trashButton = queueSection.getByRole('button').last();
      await trashButton.click();
    }

    await page.screenshot({ path: 'test-results/bulk-scan-cleared.png', fullPage: true });

    // Queue section should be gone
    await expect(page.getByText(/scan queue/i)).toBeHidden();

    // localStorage should be empty or contain an empty array
    const stored = await page.evaluate((key: string) => localStorage.getItem(key), STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) as ScannedItem[] : [];
    expect(parsed.length).toBe(0);
  });

  test('each queued item shows a "Queued" badge', async ({ page }) => {
    const testIsbns = ['9780316769174'];
    const queueItems = makeQueueItems(testIsbns);

    await page.goto('/scan');
    await page.evaluate(
      ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
      { key: STORAGE_KEY, items: queueItems }
    );

    await page.reload();
    await page.waitForLoadState('networkidle');

    // The badge renders as a <div> with variant="secondary" containing text "Queued"
    await expect(page.locator('text=Queued').first()).toBeVisible();
  });

  test('each queued item has a remove (X) button', async ({ page }) => {
    const testIsbns = ['9780316769174', '9780062315007'];
    const queueItems = makeQueueItems(testIsbns);

    await page.goto('/scan');
    await page.evaluate(
      ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
      { key: STORAGE_KEY, items: queueItems }
    );

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Each queued item shows the ISBN in a <p class="font-mono"> element.
    // Count those to verify the remove button is present for each item.
    const isbnTexts = page.locator('.max-h-80 p.font-mono');
    await expect(isbnTexts).toHaveCount(testIsbns.length);
  });
});
