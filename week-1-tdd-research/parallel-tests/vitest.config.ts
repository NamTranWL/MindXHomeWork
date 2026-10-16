import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Isolated config for /parallel-tests/ – runs independently from any legacy test suite.
 * Unit + integration only (E2E runs with Playwright, see playwright.config.ts).
 */
export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    include: ['parallel-tests/unit/**/*.test.ts', 'parallel-tests/integration/**/*.test.tsx'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['parallel-tests/setup.ts'],
    restoreMocks: true,
  },
});
