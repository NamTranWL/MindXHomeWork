import { KBApiError, ValidationError } from '../../../src/errors';
import { HTTPKBClient } from '../../../src/kb/http-kb-client';
import { expectError } from '../../helpers/kb';

const BASE = 'http://kb.test';
const DOC = { id: 'doc-001', title: 'T', content: 'C', nodePath: '/x', tags: ['a'] };

interface RecordedCall {
  url: string;
  method?: string;
  headers?: unknown;
  body: unknown;
}

/** fetch giả: ghi lại request, trả về response cho trước theo endpoint. */
function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: RecordedCall[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method,
      headers: init?.headers,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return respond(url);
  };
  return { fn: fn as typeof fetch, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('HTTPKBClient', () => {
  it('T82: gửi POST <baseUrl><endpoint>, header JSON, body đúng contract cho cả 4 thao tác', async () => {
    const { fn, calls } = fakeFetch((url) => {
      if (url.endsWith('/search')) return json(200, { results: [] });
      if (url.endsWith('/list')) return json(200, { documents: [] });
      if (url.endsWith('/retrieve')) return json(200, { document: DOC });
      return json(201, { document: DOC });
    });
    const client = new HTTPKBClient(BASE, fn);

    await client.search({ query: 'login', topK: 3 });
    await client.list({ nodePath: '/templates/email', limit: 10, recursive: true });
    await client.retrieve('doc-001');
    await client.add({ title: 'T', content: 'C', nodePath: '/x', tags: ['a'] });

    expect(calls).toEqual([
      { url: `${BASE}/search`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query: 'login', topK: 3 } },
      {
        url: `${BASE}/list`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { nodePath: '/templates/email', limit: 10, recursive: true },
      },
      { url: `${BASE}/retrieve`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { docId: 'doc-001' } },
      {
        url: `${BASE}/add`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { title: 'T', content: 'C', nodePath: '/x', tags: ['a'] },
      },
    ]);
  });

  it('T83: 400 → ValidationError với message từ body; 500 → KBApiError', async () => {
    const badRequest = new HTTPKBClient(BASE, fakeFetch(() => json(400, { error: 'topK too large' })).fn);
    const serverError = new HTTPKBClient(BASE, fakeFetch(() => json(500, { error: 'boom' })).fn);

    await expectError(() => badRequest.search({ query: 'x', topK: 5 }), ValidationError, 'topK too large');
    await expectError(() => serverError.search({ query: 'x', topK: 5 }), KBApiError, 'KB API error (500)');
  });

  it('T84: lỗi mạng → KBApiError có mã lỗi; 2xx nhưng body sai dạng → KBApiError unexpected response', async () => {
    const refused = new HTTPKBClient(
      BASE,
      fakeFetch(() => {
        throw new TypeError('fetch failed', { cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }) });
      }).fn,
    );
    const notJson = new HTTPKBClient(BASE, fakeFetch(() => new Response('<html>', { status: 200 })).fn);
    const missingField = new HTTPKBClient(BASE, fakeFetch(() => json(200, { items: [] })).fn);

    await expectError(
      () => refused.search({ query: 'x', topK: 5 }),
      KBApiError,
      `cannot reach KB API at ${BASE} (ECONNREFUSED)`,
    );
    await expectError(
      () => notJson.search({ query: 'x', topK: 5 }),
      KBApiError,
      'unexpected response from KB API (/search)',
    );
    await expectError(
      () => missingField.search({ query: 'x', topK: 5 }),
      KBApiError,
      'unexpected response from KB API (/search)',
    );
  });
});
