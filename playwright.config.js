import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,        // 2 min per test (LLM responses are slow)
  expect: { timeout: 60_000 }, // 60s for assertions (cold start + LLM)
  fullyParallel: false,    // sequential — same user state
  retries: 0,              // no retries, we want real signal
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://eazypg-chat.vercel.app',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
