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

export default defineConfig({
  plugins: [react(), mockLeaveApi()],
  server: { port: 3000, strictPort: true },
});
