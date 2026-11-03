import { startKBServer, type RunningKBServer } from '../../helpers/kb';

describe('KB server local', () => {
  let server: RunningKBServer;

  beforeEach(async () => {
    server = await startKBServer();
  });

  afterEach(async () => {
    await server.close();
  });

  const post = (path: string, body: string) =>
    fetch(`${server.url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

  it('T85: body không phải JSON hoặc sai kiểu → 400; endpoint lạ hoặc không phải POST → 404; luôn có trường error', async () => {
    const responses = [
      { res: await post('/search', '{không phải json'), status: 400 },
      { res: await post('/search', JSON.stringify({ query: 'login', topK: '5' })), status: 400 },
      { res: await post('/retrieve', JSON.stringify({})), status: 400 },
      { res: await fetch(`${server.url}/search`), status: 404 },
      { res: await post('/abc', '{}'), status: 404 },
    ];

    for (const { res, status } of responses) {
      expect(res.status).toBe(status);
      const body = (await res.json()) as { error?: unknown };
      expect(typeof body.error).toBe('string');
    }
  });
});
