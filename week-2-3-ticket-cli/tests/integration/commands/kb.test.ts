import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { run, type RunDeps } from '../../../src/commands/run';
import { MockKBClient } from '../../../src/kb/mock-kb-client';
import { KB_FIXTURE } from '../../fixtures/kb-documents';
import { existsSync, makeTempDir, removeDir, type CliResult } from '../../helpers/cli';
import { startKBServer, unusedPort } from '../../helpers/kb';

/** Chạy CLI in-process. Mặc định truyền MockKBClient với fixture; `deps: {}` để CLI tự chọn client theo env. */
async function kb(
  args: string[],
  env: Record<string, string | undefined> = {},
  deps: RunDeps = { kbClient: new MockKBClient(KB_FIXTURE) },
): Promise<CliResult> {
  let stdout = '';
  let stderr = '';
  const code = await run(['kb', ...args], {
    env,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  }, deps);
  return { code, stdout, stderr };
}

const SEARCH_LOGIN_TOP2 =
  'doc-002 /templates/email Email ACK – Login issue (match: title)\n' +
  'doc-001 /runbooks/login Runbook: Xử lý lỗi đăng nhập LMS (match: tag)\n';

describe('kb search', () => {
  it('T86: in kết quả theo thứ tự xếp hạng, cắt theo --top-k; không có kết quả thì báo rõ', async () => {
    expect(await kb(['search', 'login', '--top-k', '2'])).toEqual({ code: 0, stdout: SEARCH_LOGIN_TOP2, stderr: '' });
    expect(await kb(['search', 'xyz'])).toEqual({ code: 0, stdout: 'No documents found\n', stderr: '' });
  });

  it('T87: query rỗng hoặc --top-k sai → exit 2, stdout rỗng', async () => {
    expect(await kb(['search', ''])).toEqual({ code: 2, stdout: '', stderr: 'Error: query is required\n' });
    expect(await kb(['search', 'login', '--top-k', '0'])).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid --top-k "0". Expected an integer from 1 to 50\n',
    });
  });
});

describe('kb list', () => {
  it('T88: liệt kê tài liệu của node kèm tags; thiếu hoặc sai --node → exit 2', async () => {
    expect(await kb(['list', '--node', '/templates/email/'])).toEqual({
      code: 0,
      stdout:
        'doc-002 /templates/email Email ACK – Login issue (tags: login, ack)\n' +
        'doc-003 /templates/email Email resolution – Đã reset mật khẩu (tags: login, resolution)\n',
      stderr: '',
    });
    expect(await kb(['list'])).toEqual({ code: 2, stdout: '', stderr: 'Error: --node is required\n' });
    expect(await kb(['list', '--node', 'templates'])).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid node path "templates". Expected a path starting with "/"\n',
    });
  });
});

describe('kb retrieve', () => {
  it('T89: in 4 dòng thông tin, dòng trống, rồi nội dung; id không có → exit 1', async () => {
    expect(await kb(['retrieve', 'doc-004'])).toEqual({
      code: 0,
      stdout:
        'ID: doc-004\n' +
        'Title: DevOps on-call\n' +
        'Node: /team/devops\n' +
        'Tags: team, devops, on-call\n' +
        '\n' +
        'Trực chính: SRE. Dự phòng: DevOps Lead.\n' +
        'Kênh Teams: #devops-oncall\n',
      stderr: '',
    });
    expect(await kb(['retrieve', 'doc-999'])).toEqual({
      code: 1,
      stdout: '',
      stderr: 'Error: document doc-999 not found\n',
    });
  });
});

describe('kb add', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it('T90: thêm tài liệu từ file; file không có → 1; file rỗng → 2; trùng title → 1', async () => {
    const sms = join(dir, 'sms.md');
    const empty = join(dir, 'empty.md');
    const duplicate = join(dir, 'dup.md');
    const missing = join(dir, 'missing.md');
    await writeFile(sms, '# SMS bảo trì\nHệ thống bảo trì lúc {time}.\n', 'utf8');
    await writeFile(empty, '', 'utf8');
    await writeFile(duplicate, '# Email ACK – Login issue\nx\n', 'utf8');

    expect(await kb(['add', '--file', sms, '--path', '/templates/sms', '--tags', 'SMS,sms'])).toEqual({
      code: 0,
      stdout: 'Added document doc-005 at /templates/sms\n',
      stderr: '',
    });
    expect(await kb(['add', '--file', missing, '--path', '/x'])).toEqual({
      code: 1,
      stdout: '',
      stderr: `Error: cannot read ${missing} (ENOENT)\n`,
    });
    expect(await kb(['add', '--file', empty, '--path', '/x'])).toEqual({
      code: 2,
      stdout: '',
      stderr: `Error: file ${empty} is empty\n`,
    });
    expect(await kb(['add', '--file', duplicate, '--path', '/templates/email'])).toEqual({
      code: 1,
      stdout: '',
      stderr: 'Error: document "Email ACK – Login issue" already exists at /templates/email (doc-002)\n',
    });
  });
});

describe('kb - chọn client qua biến môi trường', () => {
  it('T91: KB_CLIENT sai → exit 2; nhưng input sai vẫn được báo trước lỗi cấu hình', async () => {
    expect(await kb(['search', 'login'], { KB_CLIENT: 'abc' }, {})).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid KB_CLIENT "abc". Allowed: mock, http\n',
    });
    expect(await kb(['search', ''], { KB_CLIENT: 'abc' }, {})).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: query is required\n',
    });
  });

  it('T92: KB_CLIENT=http + KB server local cho cùng output với mock; server không chạy → exit 1', async () => {
    const server = await startKBServer(KB_FIXTURE);
    try {
      expect(await kb(['search', 'login', '--top-k', '2'], { KB_CLIENT: 'http', KB_API_URL: server.url }, {})).toEqual({
        code: 0,
        stdout: SEARCH_LOGIN_TOP2,
        stderr: '',
      });
    } finally {
      await server.close();
    }

    const deadUrl = `http://127.0.0.1:${await unusedPort()}`;
    expect(await kb(['search', 'login'], { KB_CLIENT: 'http', KB_API_URL: deadUrl }, {})).toEqual({
      code: 1,
      stdout: '',
      stderr: `Error: cannot reach KB API at ${deadUrl} (ECONNREFUSED)\n`,
    });
  });
});

describe('kb - các hành vi khác', () => {
  it('T93: lệnh kb không tạo tickets.json', async () => {
    const dir = await makeTempDir();
    try {
      const file = join(dir, 'tickets.json');

      await kb(['search', 'login'], { TICKETS_FILE: file });

      expect(existsSync(file)).toBe(false);
    } finally {
      await removeDir(dir);
    }
  });

  it('T94: seed mặc định đủ cho ví dụ của đề — tra thông tin team và tra template email', async () => {
    const team = await kb(['search', 'on-call'], {}, {});
    const templates = await kb(['list', '--node', '/templates', '--recursive'], {}, {});

    expect(team.code).toBe(0);
    expect(team.stdout).toContain(' /team/devops ');
    expect(templates.code).toBe(0);
    expect(templates.stdout.split('\n').filter((line) => line.includes(' /templates/email ')).length).toBeGreaterThanOrEqual(3);
  });
});
