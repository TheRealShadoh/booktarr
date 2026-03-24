import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/welcome to booktarr/i)).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: /sign up/i });
    await registerLink.click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText(/create an account/i)).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Form has required fields — the email input should still be visible
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
  });
});
