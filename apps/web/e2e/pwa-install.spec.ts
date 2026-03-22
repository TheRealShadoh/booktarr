import { test, expect } from '@playwright/test';

/**
 * PWA Installability Tests
 *
 * Verifies that BookTarr meets the minimum PWA requirements:
 * - Valid web manifest linked from the document
 * - Required manifest fields (name, icons, start_url, display)
 * - Apple mobile web app meta tags
 * - Theme-color meta tag
 */

test.describe('PWA Installability', () => {
  test('manifest.json is reachable and returns valid JSON', async ({ page, request }) => {
    // First confirm the app loads and links to a manifest
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      return link?.href ?? null;
    });

    expect(manifestHref).not.toBeNull();

    // Fetch the manifest directly
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/json/);
  });

  test('manifest has required name fields', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json() as Record<string, unknown>;

    // name is required for install prompts
    expect(typeof manifest.name).toBe('string');
    expect((manifest.name as string).length).toBeGreaterThan(0);

    // short_name is strongly recommended
    expect(typeof manifest.short_name).toBe('string');
    expect((manifest.short_name as string).length).toBeGreaterThan(0);
  });

  test('manifest has correct display mode', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json() as Record<string, unknown>;

    expect(manifest.display).toBe('standalone');
  });

  test('manifest has valid start_url', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json() as Record<string, unknown>;

    expect(typeof manifest.start_url).toBe('string');
    expect((manifest.start_url as string).startsWith('/')).toBe(true);
  });

  test('manifest has at least two icons including 192px and 512px sizes', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json() as Record<string, unknown>;

    const icons = manifest.icons as Array<{ src: string; sizes: string; type: string }>;
    expect(Array.isArray(icons)).toBe(true);
    expect(icons.length).toBeGreaterThanOrEqual(2);

    const sizes = icons.map((icon) => icon.sizes);
    const has192 = sizes.some((s) => s.includes('192'));
    const has512 = sizes.some((s) => s.includes('512'));

    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });

  test('manifest icons are reachable', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.json');
    const manifest = await manifestResponse.json() as Record<string, unknown>;
    const icons = manifest.icons as Array<{ src: string; sizes: string; type: string }>;

    for (const icon of icons) {
      // Only check absolute-path or relative icons, skip data URIs
      if (icon.src.startsWith('data:')) continue;
      const src = icon.src.startsWith('/') ? icon.src : `/${icon.src}`;
      const iconResponse = await request.get(src);
      expect(iconResponse.ok(), `Icon ${src} should be reachable`).toBe(true);
    }
  });

  test('theme-color meta tag is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      return meta?.content ?? null;
    });

    expect(themeColor).not.toBeNull();
    expect((themeColor as string).length).toBeGreaterThan(0);
  });

  test('apple-mobile-web-app-capable meta tag is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const appleMeta = await page.evaluate(() => {
      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-capable"]'
      );
      return meta?.content ?? null;
    });

    expect(appleMeta).not.toBeNull();
    expect(appleMeta).toBe('yes');
  });

  test('manifest link element is in document head', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const inHead = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return false;
      return document.head.contains(link);
    });

    expect(inHead).toBe(true);
  });
});
