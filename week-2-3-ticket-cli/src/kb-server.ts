#!/usr/bin/env node
import { MockKBClient } from './kb/mock-kb-client';
import { createKBServer } from './kb/server';
import { SEED_DOCUMENTS } from './kb/seed';

/** Chạy KB server local với dữ liệu seed: `npm run kb-server` (cổng lấy từ KB_PORT, mặc định 4000). */
const port = Number(process.env.KB_PORT ?? 4000);
const server = createKBServer(new MockKBClient(SEED_DOCUMENTS));

server.listen(port, () => {
  process.stdout.write(`KB server listening on http://localhost:${port} (${SEED_DOCUMENTS.length} documents)\n`);
  process.stdout.write('Dữ liệu nằm trong bộ nhớ; tắt server (Ctrl+C) thì quay về seed.\n');
});
