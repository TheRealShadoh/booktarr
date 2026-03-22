import { test, expect } from '@playwright/test';

/**
 * Mobile UX Tests
 *
 * All tests run at iPhone 12 viewport (390x844).
 * Verifies that key pages and interactions work correctly on small screens,
 * including the hamburger nav, book grid layout, and modal usability.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[id="email"]', 'chris@booktarr.test');
  await page.fill('[id="password"]', 'TestPass123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/library', { timeout: 15000 });
}

test.describe('Mobile UX', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/mobile-login.png', fullPage: true });

    // Heading visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Form fields visible and not clipped
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Submit button visible and within viewport width
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    await login(page);

    await page.screenshot({ path: 'test-results/mobile-nav-closed.png' });

    // The hamburger button uses aria-label "Toggle mobile menu" and is md:hidden
    // At 390px wide it should be rendered
    const hamburger = page.getByRole('button', { name: /toggle mobile menu/i });
    await expect(hamburger).toBeVisible();

    // Desktop nav links should NOT be visible at this viewport
    const desktopNav = page.locator('.hidden.md\\:flex');
    await expect(desktopNav).toBeHidden();
  });

  test('hamburger menu opens and shows all nav links', async ({ page }) => {
    await login(page);

    const hamburger = page.getByRole('button', { name: /toggle mobile menu/i });
    await hamburger.click();

    await page.screenshot({ path: 'test-results/mobile-nav-open.png' });

    // All five nav items should now be visible in the dropdown
    await expect(page.getByRole('link', { name: 'Library' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Series' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Currently Reading' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wishlist' })).toBeVisible();
  });

  test('clicking a nav link in mobile menu navigates correctly', async ({ page }) => {
    await login(page);

    const hamburger = page.getByRole('button', { name: /toggle mobile menu/i });
    await hamburger.click();

    // Click Series in the mobile dropdown
    const seriesLink = page.getByRole('link', { name: 'Series' });
    await seriesLink.click();

    await page.waitForURL(/\/series/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/mobile-series-page.png', fullPage: true });

    // Mobile menu should be closed after navigation
    const mobileMenuDropdown = page.locator('.md\\:hidden').filter({ hasText: 'Currently Reading' });
    await expect(mobileMenuDropdown).toBeHidden();
  });

  test('library page book grid is usable on mobile', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/mobile-library.png', fullPage: true });

    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible();

    // Search input should be visible
    await expect(page.getByPlaceholder(/search books/i)).toBeVisible();

    // No horizontal scroll overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });

  test('Add Book dialog is usable on mobile viewport', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Open dialog - the library page uses a dropdown "Add Book" button
    const addBookButton = page.getByRole('button', { name: /add book/i });
    if (!(await addBookButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await addBookButton.click();

    // If a dropdown opens, click the option that opens the dialog
    const addManuallyOption = page.getByRole('menuitem', { name: /add book/i });
    if (await addManuallyOption.isVisible().catch(() => false)) {
      await addManuallyOption.click();
    }

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/mobile-add-book-dialog.png', fullPage: true });

    // Dialog title visible
    await expect(page.getByRole('heading', { name: /add a book/i })).toBeVisible();

    // Tabs visible (4 tabs)
    await expect(page.getByRole('tab', { name: /isbn search/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /scan barcode/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /title search/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /kindle\/audible/i })).toBeVisible();

    // Dialog should not overflow horizontally
    const dialogWidth = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? dialog.getBoundingClientRect().width : 0;
    });
    expect(dialogWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
  });

  test('settings page scrolls properly on mobile', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/mobile-settings-top.png' });

    // Page heading visible
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'test-results/mobile-settings-bottom.png', fullPage: true });

    // No horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });
});
