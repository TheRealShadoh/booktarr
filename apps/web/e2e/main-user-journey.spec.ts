import { test, expect } from '@playwright/test';

/**
 * Main User Journey Test Suite
 *
 * Tests the core user flow through the application:
 * 1. Authentication (register/login)
 * 2. Library browsing
 * 3. Series viewing
 * 4. Book management
 */

test.describe('Main User Journey', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  test('complete user journey: register, browse, add book', async ({ page }) => {
    // Step 1: Navigate to homepage (should redirect to login)
    await page.goto('/');
    await expect(page).toHaveURL(/\/(login|auth)/);

    // Step 2: Navigate to register page
    const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    } else {
      await page.goto('/register');
    }

    // Step 3: Register new user
    await page.getByLabel(/name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).first().fill(testUser.password);

    // Confirm password if field exists
    const confirmPasswordField = page.getByLabel(/confirm password/i);
    if (await confirmPasswordField.isVisible().catch(() => false)) {
      await confirmPasswordField.fill(testUser.password);
    }

    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Step 4: Should be redirected to library after successful registration
    await expect(page).toHaveURL(/\/(library|dashboard)/, { timeout: 10000 });

    // Step 5: Verify library page loads
    await expect(page.getByRole('heading', { name: /library|my books/i })).toBeVisible({ timeout: 5000 });

    // Step 6: Navigate to Series page
    const seriesLink = page.getByRole('link', { name: /series/i });
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await expect(page).toHaveURL(/\/series/);
      await expect(page.getByRole('heading', { name: /series/i })).toBeVisible();
    }

    // Step 7: Navigate back to Library
    const libraryLink = page.getByRole('link', { name: /library/i });
    await libraryLink.click();
    await expect(page).toHaveURL(/\/library/);

    // Step 8: Try to add a book (if add book button exists)
    const addBookButton = page.getByRole('button', { name: /add book/i });
    if (await addBookButton.isVisible().catch(() => false)) {
      await addBookButton.click();

      // Verify dialog/modal opens
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle authentication flow', async ({ page }) => {
    // Test login page is accessible
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();

    // Verify form elements exist
    await expect(page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))).toBeVisible();
    await expect(page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i))).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should navigate between main pages', async ({ page }) => {
    // This test assumes user is logged in or pages are accessible
    // Adjust based on your auth requirements

    const pagesToTest = [
      { path: '/library', heading: /library|my books/i },
      { path: '/series', heading: /series/i },
    ];

    for (const pageTest of pagesToTest) {
      await page.goto(pageTest.path);

      // Check if redirected to login (protected route)
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
        // Page is protected, skip
        continue;
      }

      // Verify page loads
      await expect(page.getByRole('heading', { name: pageTest.heading })).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    // Try to navigate to library, handle auth redirect
    await page.goto('/library');
  });

  test('should display library page elements', async ({ page }) => {
    // Skip if redirected to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Verify key elements exist
    const heading = page.getByRole('heading', { name: /library|my books/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Series Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/series');
  });

  test('should display series page elements', async ({ page }) => {
    // Skip if redirected to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Verify key elements exist
    const heading = page.getByRole('heading', { name: /series/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
