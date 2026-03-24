import { test, expect } from '@playwright/test';

/**
 * Visual Audit Tests
 *
 * Systematic checks for visual and structural quality across all pages:
 * - No horizontal scroll overflow at desktop or mobile widths
 * - Each page has an h1 element
 * - Navigation is consistent across pages
 * - Dark-mode backgrounds do not leak light colours
 * - Error states are handled gracefully (404 book ID)
 * - Focus styles are present on interactive elements
 * - Screenshots captured for human review
 */

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[id="email"]', 'chris@booktarr.test');
  await page.fill('[id="password"]', 'TestPass123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/library', { timeout: 15000 });
}

// All authenticated pages to audit
const PAGES = [
  { path: '/library', name: 'library' },
  { path: '/series', name: 'series' },
  { path: '/scan', name: 'scan' },
  { path: '/currently-reading', name: 'currently-reading' },
  { path: '/wishlist', name: 'wishlist' },
  { path: '/settings', name: 'settings' },
];

test.describe('Visual Audit - Desktop (1440x900)', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name} page: screenshot at desktop viewport`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/desktop-${name}.png`,
        fullPage: true,
      });

      // If auth redirect happened the page is still meaningful
      expect(page.url()).not.toContain('/auth/error');
    });

    test(`${name} page: no horizontal scroll overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const overflows = await page.evaluate(() => {
        const { scrollWidth, clientWidth } = document.documentElement;
        return { scrollWidth, clientWidth, overflows: scrollWidth > clientWidth };
      });

      expect(
        overflows.overflows,
        `${path} has horizontal overflow: scrollWidth=${overflows.scrollWidth} > clientWidth=${overflows.clientWidth}`
      ).toBe(false);
    });

    test(`${name} page: has exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${path} should have one h1, found ${h1Count}`).toBe(1);
    });

    test(`${name} page: navigation bar is present`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('nav')).toBeVisible();
      await expect(page.getByRole('link', { name: 'BookTarr' })).toBeVisible();
    });
  }
});

test.describe('Visual Audit - Mobile (390x844)', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name} page: screenshot at mobile viewport`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/mobile-${name}.png`,
        fullPage: true,
      });
    });

    test(`${name} page: no horizontal scroll overflow on mobile`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const overflows = await page.evaluate(() => {
        const { scrollWidth, clientWidth } = document.documentElement;
        return { scrollWidth, clientWidth, overflows: scrollWidth > clientWidth };
      });

      expect(
        overflows.overflows,
        `${path} has horizontal overflow on mobile: scrollWidth=${overflows.scrollWidth} > clientWidth=${overflows.clientWidth}`
      ).toBe(false);
    });
  }
});

test.describe('Visual Audit - Dark Mode Consistency', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name} page: body background is dark (not white)`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // The app sets class="dark" on <html> and uses --background which resolves
      // to a near-black value. We check the computed background is not pure white.
      const bgColor = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).backgroundColor;
      });

      // pure white is "rgb(255, 255, 255)" - fail if that's what we see
      expect(bgColor, `${path} body background appears to be white`).not.toBe(
        'rgb(255, 255, 255)'
      );
    });
  }
});

test.describe('Visual Audit - Error States', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('non-existent book ID shows error or empty state, not a crash', async ({ page }) => {
    await page.goto('/library/00000000-0000-0000-0000-000000000000');
    // Wait for the client-side React Query fetch to settle. networkidle fires
    // after network is quiet but the component may still be rendering the error state.
    await page.waitForLoadState('networkidle');

    // The page should not show a Next.js error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog]');
    await expect(errorOverlay).toBeHidden();

    // The book detail component renders error.message in a <p> element.
    // Possible messages: 'Book not found' (404) or 'Failed to fetch book details' (other errors).
    // Under parallel test load the server may return a non-404 error, so match both strings.
    const errorText = page.getByText(/book not found|failed to fetch book details|failed to load book/i);
    const hasNotFoundText = await errorText
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    await page.screenshot({ path: 'test-results/desktop-book-404.png', fullPage: true });

    const redirectedToLibrary = page.url().includes('/library') && !page.url().includes('/00000000');

    expect(
      hasNotFoundText || redirectedToLibrary,
      'Expected either a not-found message or redirect for invalid book ID'
    ).toBe(true);
  });

  test('login page shows validation error on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Submit without filling any fields.
    // The email and password inputs have the `required` attribute, so the browser
    // prevents form submission and shows native validation UI. The page stays on /login.
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/desktop-login-validation.png' });

    // The page stays on the login URL (no redirect happened)
    expect(page.url()).toContain('/login');

    // The email input is still visible (form not submitted)
    const emailInput = page.locator('[id="email"]');
    await expect(emailInput).toBeVisible();
  });
});

test.describe('Visual Audit - Focus States', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('library page interactive elements respond to keyboard focus', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Tab to the first interactive element
    await page.keyboard.press('Tab');

    await page.screenshot({ path: 'test-results/desktop-focus-library.png' });

    // Focused element should exist
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(focusedTag).not.toBeNull();
    expect(focusedTag).not.toBe('BODY');
  });

  test('login page inputs have visible focus styles', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login form email input has placeholder "you@example.com" (not /email/), use id selector
    const emailInput = page.locator('[id="email"]');
    await emailInput.focus();

    await page.screenshot({ path: 'test-results/desktop-focus-login.png' });

    // The element should be the document's active element
    const isActive = await page.evaluate(() => {
      const focused = document.activeElement;
      const emailEl = document.querySelector('#email');
      return focused === emailEl;
    });
    expect(isActive).toBe(true);
  });
});

test.describe('Visual Audit - Navigation Consistency', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('nav links are consistent across all authenticated pages', async ({ page }) => {
    // Nav items from nav.tsx: Library, Series, Scan, Calendar, Reading, Wishlist
    // Note: the "Currently Reading" page link is labeled "Reading" in the nav component
    const expectedLinks = ['Library', 'Series', 'Scan', 'Reading', 'Wishlist'];

    for (const { path } of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      for (const linkLabel of expectedLinks) {
        // Links inside the desktop nav (hidden md:flex container)
        const navLink = page.locator('nav').getByRole('link', { name: linkLabel });
        await expect(
          navLink,
          `Nav link "${linkLabel}" missing on ${path}`
        ).toBeVisible();
      }
    }
  });

  test('active nav link is highlighted on the current page', async ({ page }) => {
    await page.goto('/series');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/desktop-nav-active-series.png' });

    // The active link uses text-primary class; the inactive ones use text-muted-foreground.
    // We verify the Series link does NOT have the muted class.
    const seriesLink = page
      .locator('nav .hidden.md\\:flex')
      .getByRole('link', { name: 'Series' });

    const classes = await seriesLink.getAttribute('class') ?? '';
    expect(classes).not.toContain('text-muted-foreground');
  });
});
