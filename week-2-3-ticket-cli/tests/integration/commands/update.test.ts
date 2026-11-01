import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeTempDir, readJson, readText, removeDir, runCli } from '../../helpers/cli';

describe('tickets update', () => {
  let dir: string;
  let file: string;
  const seed = JSON.stringify([
    { id: 1, title: 'Login lỗi 500', description: '', status: 'open', priority: 'high', tags: ['lms'] },
    { id: 2, title: 'Trang chủ chậm', description: '', status: 'in-progress', priority: 'medium', tags: [] },
  ]);

  beforeEach(async () => {
    dir = await makeTempDir();
    file = join(dir, 'tickets.json');
    await writeFile(file, seed, 'utf8');
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it('T58: update 1 --status closed → exit 0, file được cập nhật', async () => {
    const result = await runCli(['update', '1', '--status', 'closed'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 0, stdout: 'Updated ticket #1: status = closed\n', stderr: '' });
    expect(readJson(file)).toEqual([
      expect.objectContaining({ id: 1, status: 'closed' }),
      expect.objectContaining({ id: 2, status: 'in-progress' }),
    ]);
  });

  it('T59: update 1 --status open khi đang open → exit 0', async () => {
    const result = await runCli(['update', '1', '--status', 'open'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 0, stdout: 'Updated ticket #1: status = open\n', stderr: '' });
  });

  it('T60: update 1 --status done → exit 2, liệt kê status hợp lệ, file không đổi', async () => {
    const result = await runCli(['update', '1', '--status', 'done'], { TICKETS_FILE: file });

    expect(result).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid status "done". Allowed: open, in-progress, closed\n',
    });
    expect(readText(file)).toBe(seed);
  });

  it('T61: update 1 thiếu --status → exit 2, file không đổi', async () => {
    const result = await runCli(['update', '1'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 2, stdout: '', stderr: 'Error: --status is required\n' });
    expect(readText(file)).toBe(seed);
  });

  it('T62: update 99 --status closed → exit 1, ticket không tồn tại', async () => {
    const result = await runCli(['update', '99', '--status', 'closed'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 1, stdout: '', stderr: 'Error: ticket #99 not found\n' });
    expect(readText(file)).toBe(seed);
  });
});
