import { defineConfig, devices } from '@playwright/test';

/**
 * E2E for /parallel-tests/. Every API call is intercepted inside the spec (page.route),
 * so only the web app itself must be running. Without BASE_URL the demo app is started automatically.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky test must be fixed, not retried
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No BASE_URL given → start the demo app (Vite) automatically; reuse it if it is already running.
  ...(process.env.BASE_URL
    ? {}
    : { webServer: { command: 'npm run dev', url: 'http://localhost:3000/schedule', reuseExistingServer: true } }),
});
