import { join } from 'node:path';
import { makeTempDir, removeDir, runCliProcess, SUBPROCESS_TIMEOUT_MS } from '../../helpers/cli';

describe('tickets - hành vi chung (subprocess)', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await makeTempDir();
    file = join(dir, 'tickets.json');
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it(
    'T63: lệnh không tồn tại hoặc option lạ → exit 2, báo lỗi ra stderr, stdout rỗng',
    () => {
      const unknownCommand = runCliProcess(['foo'], { TICKETS_FILE: file });
      const unknownOption = runCliProcess(['create', '--title', 'x', '--bogus'], { TICKETS_FILE: file });

      expect(unknownCommand).toEqual({ code: 2, stdout: '', stderr: expect.stringMatching(/unknown command 'foo'/) });
      expect(unknownOption).toEqual({ code: 2, stdout: '', stderr: expect.stringMatching(/unknown option '--bogus'/) });
    },
    SUBPROCESS_TIMEOUT_MS,
  );

  it(
    'T64: create rồi list ở hai lần chạy riêng → dữ liệu còn',
    () => {
      runCliProcess(['create', '--title', 'Lưu qua 2 lần chạy', '--tags', 'lms'], { TICKETS_FILE: file });

      const result = runCliProcess(['list'], { TICKETS_FILE: file });

      expect(result).toEqual({ code: 0, stdout: '#1 [open] [medium] Lưu qua 2 lần chạy (tags: lms)\n', stderr: '' });
    },
    SUBPROCESS_TIMEOUT_MS,
  );
});
