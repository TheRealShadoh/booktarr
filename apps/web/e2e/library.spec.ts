import { test, expect } from '@playwright/test';

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real test, you would set up authentication here
    // For now, this assumes the user is already logged in
    await page.goto('/library');
  });

  test('should display library page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search books/i);
    await expect(searchInput).toBeVisible();
  });

  test('should display add book button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add book/i });
    await expect(addButton).toBeVisible();
  });

  test('should open filters popover', async ({ page }) => {
    const filtersButton = page.getByRole('button', { name: /filters/i });
    await filtersButton.click();

    await expect(page.getByText(/search filters/i)).toBeVisible();
  });

  test('should filter books by search query', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search books/i);
    await searchInput.fill('Stormlight');

    const searchButton = page.getByRole('button', { name: /^search$/i });
    await searchButton.click();

    // Wait for results to load
    await page.waitForTimeout(1000);

    // Results should be filtered (exact assertion depends on test data)
  });

  test('should open CSV import dialog', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add book/i });
    await addButton.click();

    const importOption = page.getByRole('menuitem', { name: /import from csv/i });
    await importOption.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/import from csv/i)).toBeVisible();
  });
});
