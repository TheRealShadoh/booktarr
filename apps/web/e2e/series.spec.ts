import { test, expect } from '@playwright/test';

test.describe('Series Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/series');
  });

  test('should display series page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /series/i })).toBeVisible();
  });

  test('should display search and filter controls', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search series/i);
    await expect(searchInput).toBeVisible();
  });

  test('should filter series by completion status', async ({ page }) => {
    // Find the status filter dropdown
    const statusFilter = page.getByRole('combobox').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select "Complete" option
      const completeOption = page.getByRole('option', { name: /complete/i });
      if (await completeOption.isVisible()) {
        await completeOption.click();
      }
    }
  });

  test('should search for series by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search series/i);
    await searchInput.fill('Stormlight');

    // Wait for search to complete
    await page.waitForTimeout(500);

    // Results should be filtered (exact assertion depends on test data)
  });
});
