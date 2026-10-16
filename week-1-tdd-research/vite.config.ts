import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

import { initialLeaveWeek } from './parallel-tests/fixtures/leave-week';

/**
 * Dev-only fake backend so `npm run dev` works without a server: GET/PUT /api/leave-week kept in memory.
 * (E2E tests do NOT rely on it – they intercept every /api call themselves.)
 */
function mockLeaveApi(): Plugin {
  let week = initialLeaveWeek();
  return {
    name: 'mock-leave-api',
    configureServer(server) {
      // Health check: Playwright's webServer waits for THIS url, so an unrelated app on the same port never passes.
      server.middlewares.use('/__week1-demo-health', (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ app: 'week1-leave-standby', ok: true }));
      });
      server.middlewares.use('/api/leave-week', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(week));
          return;
        }
        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            const payload = JSON.parse(body) as Pick<typeof week, 'leaves' | 'standby'>;
            week = { ...week, leaves: payload.leaves, standby: payload.standby };
            res.statusCode = 204;
            res.end();
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

/** Single source of truth for the demo address (also used by parallel-tests/playwright.config.ts). */
export const DEMO_HOST = '127.0.0.1';
export const DEMO_PORT = 4317;

export default defineConfig({
  plugins: [react(), mockLeaveApi()],
  // strictPort: if 4317 is busy Vite fails loudly instead of silently moving to another port.
  server: { host: DEMO_HOST, port: DEMO_PORT, strictPort: true },
});
