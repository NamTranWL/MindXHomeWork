import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeTempDir, removeDir, runCli, runCliProcess, SUBPROCESS_TIMEOUT_MS } from '../../helpers/cli';

describe('tickets show', () => {
  let dir: string;
  let file: string;
  const seed = [
    { id: 1, title: 'Login lỗi 500', description: 'Lỗi khi đăng nhập', status: 'open', priority: 'high', tags: ['lms', 'login'] },
    { id: 2, title: 'Trang chủ chậm', description: '', status: 'in-progress', priority: 'medium', tags: [] },
  ];

  beforeEach(async () => {
    dir = await makeTempDir();
    file = join(dir, 'tickets.json');
    await writeFile(file, JSON.stringify(seed), 'utf8');
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it('T55: show 1 → in đủ 6 field, exit 0; field rỗng in "-"', async () => {
    const full = await runCli(['show', '1'], { TICKETS_FILE: file });
    const empty = await runCli(['show', '2'], { TICKETS_FILE: file });

    expect(full).toEqual({
      code: 0,
      stdout:
        'ID: 1\nTitle: Login lỗi 500\nDescription: Lỗi khi đăng nhập\nStatus: open\nPriority: high\nTags: lms, login\n',
      stderr: '',
    });
    expect(empty.stdout).toBe(
      'ID: 2\nTitle: Trang chủ chậm\nDescription: -\nStatus: in-progress\nPriority: medium\nTags: -\n',
    );
  });

  it(
    'T56: show 99 → exit 1, stderr "Error: ticket #99 not found", không có stack trace (subprocess)',
    () => {
      const result = runCliProcess(['show', '99'], { TICKETS_FILE: file });

      expect(result).toEqual({ code: 1, stdout: '', stderr: 'Error: ticket #99 not found\n' });
    },
    SUBPROCESS_TIMEOUT_MS,
  );

  it.each(['abc', '0'])('T57: show %s → exit 2', async (raw) => {
    const result = await runCli(['show', raw], { TICKETS_FILE: file });

    expect(result).toEqual({
      code: 2,
      stdout: '',
      stderr: `Error: invalid id "${raw}". Expected a positive integer\n`,
    });
  });
});
