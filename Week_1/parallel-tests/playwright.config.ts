import { defineConfig, devices } from '@playwright/test';

/**
 * E2E for /parallel-tests/. Every API call is intercepted inside the spec (page.route),
 * so only the web app itself must be running.
 *
 * - No BASE_URL  → Playwright starts the demo app (Vite) on http://127.0.0.1:4317 (same values as vite.config.ts).
 *   An already running server is reused ONLY if it answers the demo-specific health URL, so an unrelated
 *   website on the same port can never be tested by mistake (vite uses strictPort → it fails loudly instead).
 * - BASE_URL set → test that app instead, no webServer is started.
 */
const DEMO_URL = 'http://127.0.0.1:4317';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky test must be fixed, not retried
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? DEMO_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: `${DEMO_URL}/__week1-demo-health`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
});
