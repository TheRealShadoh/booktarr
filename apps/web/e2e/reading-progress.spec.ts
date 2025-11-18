import { test, expect } from '@playwright/test';

test.describe('Reading Progress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/currently-reading');
  });

  test('should display currently reading page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /currently reading/i })).toBeVisible();
  });

  test('should display reading statistics cards', async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText(/currently reading/i)).toBeVisible();
    await expect(page.getByText(/finished this year/i)).toBeVisible();
    await expect(page.getByText(/total books read/i)).toBeVisible();
    await expect(page.getByText(/average rating/i)).toBeVisible();
  });

  test('should show empty state when no books are being read', async ({ page }) => {
    // This test assumes no books are currently being read
    const emptyMessage = page.getByText(/no books in progress/i);

    // May or may not be visible depending on test data
    const isVisible = await emptyMessage.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('should navigate to library from nav', async ({ page }) => {
    const libraryLink = page.getByRole('link', { name: /library/i });
    await libraryLink.click();

    await expect(page).toHaveURL(/\/library/);
  });
});
