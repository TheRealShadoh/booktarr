import { defineConfig, devices } from '@playwright/test';

// Use live Vercel deployment or local dev server
const baseURL = process.env.TEST_URL || 'https://booktarr.vercel.app';
const isLocal = baseURL.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  ...(isLocal ? {
    webServer: {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: true,
    },
  } : {}),
});
