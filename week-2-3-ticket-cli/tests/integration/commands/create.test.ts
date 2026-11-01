import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  existsSync,
  makeTempDir,
  readJson,
  readText,
  removeDir,
  runCli,
  runCliProcess,
  SUBPROCESS_TIMEOUT_MS,
} from '../../helpers/cli';

describe('tickets create', () => {
  let dir: string;
  let file: string;
  const existing = JSON.stringify([
    { id: 1, title: 'Có sẵn', description: '', status: 'open', priority: 'low', tags: [] },
  ]);

  beforeEach(async () => {
    dir = await makeTempDir();
    file = join(dir, 'tickets.json');
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it(
    'T41: file chưa có → exit 0, in "Created ticket #1", file đúng 1 ticket (subprocess)',
    () => {
      const result = runCliProcess(['create', '--title', 'Login lỗi 500', '--priority', 'high'], {
        TICKETS_FILE: file,
      });

      expect(result).toEqual({ code: 0, stdout: 'Created ticket #1\n', stderr: '' });
      expect(readJson(file)).toEqual([
        { id: 1, title: 'Login lỗi 500', description: '', status: 'open', priority: 'high', tags: [] },
      ]);
    },
    SUBPROCESS_TIMEOUT_MS,
  );

  it('T41b: --description (không trim) và --status được lưu đúng', async () => {
    const result = await runCli(
      ['create', '--title', 'x', '--description', '  mô tả  ', '--status', 'in-progress'],
      { TICKETS_FILE: file },
    );

    expect(result.code).toBe(0);
    expect(readJson(file)).toEqual([
      { id: 1, title: 'x', description: '  mô tả  ', status: 'in-progress', priority: 'medium', tags: [] },
    ]);
  });

  it('T42: --tags "LMS, login,lms" → lưu ["lms","login"]', async () => {
    await runCli(['create', '--title', 'x', '--tags', 'LMS, login,lms'], { TICKETS_FILE: file });

    expect(readJson(file)).toEqual([expect.objectContaining({ tags: ['lms', 'login'] })]);
  });

  it('T43: --tags a,b --tags c → gộp thành ["a","b","c"]', async () => {
    await runCli(['create', '--title', 'x', '--tags', 'a,b', '--tags', 'c'], { TICKETS_FILE: file });

    expect(readJson(file)).toEqual([expect.objectContaining({ tags: ['a', 'b', 'c'] })]);
  });

  it(
    'T44: thiếu title → exit 2, stderr "Error: --title is required", stdout rỗng, không tạo file (subprocess)',
    () => {
      const result = runCliProcess(['create', '--priority', 'high'], { TICKETS_FILE: file });

      expect(result).toEqual({ code: 2, stdout: '', stderr: 'Error: --title is required\n' });
      expect(existsSync(file)).toBe(false);
    },
    SUBPROCESS_TIMEOUT_MS,
  );

  it('T45: title chỉ có khoảng trắng → exit 2, file không đổi', async () => {
    await writeFile(file, existing, 'utf8');

    const result = await runCli(['create', '--title', '   '], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 2, stdout: '', stderr: 'Error: --title is required\n' });
    expect(readText(file)).toBe(existing);
  });

  it('T46: --priority urgent → exit 2, file không đổi', async () => {
    await writeFile(file, existing, 'utf8');

    const result = await runCli(['create', '--title', 'x', '--priority', 'urgent'], { TICKETS_FILE: file });

    expect(result).toEqual({
      code: 2,
      stdout: '',
      stderr: 'Error: invalid priority "urgent". Allowed: low, medium, high\n',
    });
    expect(readText(file)).toBe(existing);
  });

  it('T47: file hỏng → exit 1, báo lỗi đọc file, file giữ nguyên', async () => {
    await writeFile(file, '{ not json', 'utf8');

    const result = await runCli(['create', '--title', 'x'], { TICKETS_FILE: file });

    expect(result).toEqual({ code: 1, stdout: '', stderr: `Error: cannot read ${file} (invalid JSON)\n` });
    expect(readText(file)).toBe('{ not json');
  });

  it('T48: file 0 byte → exit 0, id = 1', async () => {
    await writeFile(file, '', 'utf8');

    const result = await runCli(['create', '--title', 'x'], { TICKETS_FILE: file });

    expect(result.stdout).toBe('Created ticket #1\n');
    expect(readJson(file)).toEqual([expect.objectContaining({ id: 1, title: 'x' })]);
  });
});
