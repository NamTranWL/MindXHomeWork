import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  existsSync,
  makeTempDir,
  readText,
  removeDir,
  runCli,
  runCliProcess,
  SUBPROCESS_TIMEOUT_MS,
} from '../../helpers/cli';

describe('tickets list', () => {
  let dir: string;
  let file: string;
  const seed = [
    { id: 2, title: 'Trang chủ chậm', description: '', status: 'in-progress', priority: 'medium', tags: [] },
    { id: 1, title: 'Login lỗi 500', description: 'Lỗi khi đăng nhập', status: 'open', priority: 'high', tags: ['lms', 'login'] },
    { id: 3, title: 'Sai chính tả', description: '', status: 'open', priority: 'low', tags: ['lms'] },
  ];
  const line1 = '#1 [open] [high] Login lỗi 500 (tags: lms, login)\n';
  const line2 = '#2 [in-progress] [medium] Trang chủ chậm\n';
  const line3 = '#3 [open] [low] Sai chính tả (tags: lms)\n';

  beforeEach(async () => {
    dir = await makeTempDir();
    file = join(dir, 'tickets.json');
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  const seedFile = () => writeFile(file, JSON.stringify(seed), 'utf8');

  it('T49: có dữ liệu → in mỗi ticket một dòng theo id tăng dần, exit 0', async () => {
    await seedFile();

    const result = await runCli(['list'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 0, stdout: line1 + line2 + line3, stderr: '' });
  });

  it('T50: file chưa tồn tại → exit 0, báo rỗng, không tạo file', async () => {
    const result = await runCli(['list'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 0, stdout: 'No tickets found\n', stderr: '' });
    expect(existsSync(file)).toBe(false);
  });

  it('T51: --status open --priority high → chỉ in ticket khớp', async () => {
    await seedFile();

    const result = await runCli(['list', '--status', 'open', '--priority', 'high'], { TICKETS_FILE: file });

    expect(result.stdout).toBe(line1);
  });

  it('T52: --tags lms,login → AND; --tags LMS khớp tag "lms"', async () => {
    await seedFile();

    const both = await runCli(['list', '--tags', 'lms,login'], { TICKETS_FILE: file });
    const upper = await runCli(['list', '--tags', 'LMS'], { TICKETS_FILE: file });

    expect(both.stdout).toBe(line1);
    expect(upper.stdout).toBe(line1 + line3);
  });

  it('T53: --status done → exit 2', async () => {
    await seedFile();

    const result = await runCli(['list', '--status', 'done'], { TICKETS_FILE: file });

    expect(result).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid status "done". Allowed: open, in-progress, closed\n',
    });
  });

  it(
    'T54: file hỏng → exit 1, stderr "Error: cannot read <file> (invalid JSON)", file giữ nguyên (subprocess)',
    async () => {
      await writeFile(file, '{ not json', 'utf8');

      const result = runCliProcess(['list'], { TICKETS_FILE: file });

      expect(result).toEqual({ code: 1, stdout: '', stderr: `Error: cannot read ${file} (invalid JSON)\n` });
      expect(readText(file)).toBe('{ not json');
    },
    SUBPROCESS_TIMEOUT_MS,
  );
});
