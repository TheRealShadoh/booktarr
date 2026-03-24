import { request } from '@playwright/test';

const TEST_USER = {
  name: 'Test User',
  email: 'chris@booktarr.test',
  password: 'TestPass123',
};

/**
 * Global setup: ensure the test user exists on the target environment.
 * Runs once before the entire test suite.
 * - 201 = user created
 * - 409 = user already exists (fine)
 * - anything else = fail fast
 */
async function globalSetup() {
  const baseURL = process.env.TEST_URL || 'https://booktarr.vercel.app';

  const ctx = await request.newContext({ baseURL });

  try {
    const res = await ctx.post('/api/auth/register', {
      data: TEST_USER,
    });

    const status = res.status();

    if (status === 201) {
      console.log(`[global-setup] Test user registered: ${TEST_USER.email}`);
    } else if (status === 409) {
      console.log(`[global-setup] Test user already exists: ${TEST_USER.email}`);
    } else if (status === 429) {
      // Rate limited — user likely already exists from a previous run
      console.log(`[global-setup] Rate limited on register — assuming test user exists`);
    } else {
      const body = await res.text();
      throw new Error(
        `[global-setup] Failed to ensure test user (HTTP ${status}): ${body}`
      );
    }
  } finally {
    await ctx.dispose();
  }
}

export default globalSetup;
