import { ConflictError, NotFoundError } from '../../../src/errors';
import type { KBClient } from '../../../src/kb/kb-client';
import { HTTPKBClient } from '../../../src/kb/http-kb-client';
import { MockKBClient } from '../../../src/kb/mock-kb-client';
import type { Document } from '../../../src/models/kb';
import { KB_FIXTURE } from '../../fixtures/kb-documents';
import { expectError, startKBServer, type RunningKBServer } from '../../helpers/kb';

interface ClientHandle {
  client: KBClient;
  dispose: () => Promise<void>;
}

/** Rút gọn kết quả search thành "id (matchType)" cho dễ đọc khi so sánh. */
const summary = (results: Array<{ document: { id: string }; matchType: string }>) =>
  results.map((r) => `${r.document.id} (${r.matchType})`);
const ids = (docs: Array<{ id: string }>) => docs.map((d) => d.id);

/** Cùng một bộ test hành vi cho mọi KBClient (SPEC §5, T75–T81). */
function kbClientContract(name: string, makeClient: (docs: readonly Document[]) => Promise<ClientHandle>) {
  describe(`KBClient contract — ${name}`, () => {
    let handle: ClientHandle | undefined;
    let client: KBClient;

    const dispose = async () => {
      await handle?.dispose();
      handle = undefined;
    };

    /** Tạo client mới với dữ liệu cho trước (mặc định là fixture), dọn client cũ nếu có. */
    const use = async (docs: readonly Document[] = KB_FIXTURE) => {
      await dispose();
      handle = await makeClient(docs);
      client = handle.client;
    };

    beforeEach(async () => {
      await use();
    });

    afterEach(dispose);

    it('T75: search "login" → title trước tag, cùng điểm thì theo id', async () => {
      const results = await client.search({ query: 'login', topK: 5 });

      expect(summary(results)).toEqual(['doc-002 (title)', 'doc-001 (tag)', 'doc-003 (tag)']);
      expect(results[0]).toEqual({
        document: { id: 'doc-002', title: 'Email ACK – Login issue', nodePath: '/templates/email' },
        matchType: 'title',
      });
    });

    it('T76: search bỏ dấu, không phân biệt hoa thường, cắt theo topK, không khớp thì rỗng', async () => {
      expect(summary(await client.search({ query: 'dang nhap', topK: 5 }))).toEqual([
        'doc-001 (title)',
        'doc-003 (content)',
      ]);
      expect(summary(await client.search({ query: 'LOGIN ISSUE', topK: 5 }))).toEqual(['doc-002 (title)']);
      expect(await client.search({ query: 'login', topK: 1 })).toHaveLength(1);
      expect(await client.search({ query: 'zzqx-khong-co', topK: 5 })).toEqual([]);
    });

    it('T77: list đúng node, đệ quy khi có recursive, sắp theo id và cắt limit', async () => {
      expect(ids(await client.list({ nodePath: '/templates/email', limit: 10, recursive: false }))).toEqual([
        'doc-002',
        'doc-003',
      ]);
      expect(await client.list({ nodePath: '/templates', limit: 10, recursive: false })).toEqual([]);
      expect(ids(await client.list({ nodePath: '/templates', limit: 10, recursive: true }))).toEqual([
        'doc-002',
        'doc-003',
      ]);
      expect(ids(await client.list({ nodePath: '/', limit: 2, recursive: true }))).toEqual(['doc-001', 'doc-002']);
      expect(await client.list({ nodePath: '/khong-co-node', limit: 10, recursive: true })).toEqual([]);
    });

    it('T78: tài liệu ở /templates-old không bị coi là con của /templates', async () => {
      await use([
        ...KB_FIXTURE,
        { id: 'doc-009', title: 'Old', content: 'x', nodePath: '/templates-old/email', tags: [] },
      ]);

      const result = await client.list({ nodePath: '/templates', limit: 10, recursive: true });

      expect(ids(result)).not.toContain('doc-009');
    });

    it('T79: retrieve trả đủ 5 trường; id không có → NotFoundError', async () => {
      expect(await client.retrieve('doc-004')).toEqual(KB_FIXTURE[3]);

      await expectError(() => client.retrieve('doc-999'), NotFoundError, 'document doc-999 not found');
    });

    it('T80: add sinh doc-005, retrieve lại ra đúng dữ liệu, fixture gốc không đổi', async () => {
      const before = structuredClone(KB_FIXTURE);
      const input = { title: 'SMS bảo trì', content: 'Nội dung\n', nodePath: '/templates/sms', tags: ['sms'] };

      const added = await client.add(input);

      expect(added).toEqual({ id: 'doc-005', ...input });
      expect(await client.retrieve('doc-005')).toEqual(added);
      expect(KB_FIXTURE).toEqual(before);
    });

    it('T81: trùng title (sau normalize) trong cùng node → ConflictError; khác node thì được', async () => {
      await expectError(
        () =>
          client.add({ title: 'email ack – login issue ', content: 'x', nodePath: '/templates/email', tags: [] }),
        ConflictError,
        'document "email ack – login issue" already exists at /templates/email (doc-002)',
      );

      const added = await client.add({
        title: 'Email ACK – Login issue',
        content: 'x',
        nodePath: '/templates/sms',
        tags: [],
      });

      expect(added.nodePath).toBe('/templates/sms');
    });
  });
}

kbClientContract('MockKBClient', async (docs) => ({
  client: new MockKBClient(docs),
  dispose: async () => {},
}));

kbClientContract('HTTPKBClient + KB server local', async (docs) => {
  const server: RunningKBServer = await startKBServer(docs);
  return { client: new HTTPKBClient(server.url), dispose: server.close };
});
