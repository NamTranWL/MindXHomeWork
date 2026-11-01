import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonFileRepository } from '../../../src/storage/json-file-repository';
import { ticket } from '../../helpers/in-memory-repository';

const exactly = (message: string) =>
  new RegExp('^' + message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');

describe('JsonFileRepository (file thật trong thư mục tạm)', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tickets-'));
    file = join(dir, 'tickets.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('T32: file không tồn tại → đọc ra []', async () => {
    expect(await new JsonFileRepository(file).load()).toEqual([]);
  });

  it('T33: file 0 byte → []', async () => {
    await writeFile(file, '');

    expect(await new JsonFileRepository(file).load()).toEqual([]);
  });

  it('T34: file chỉ có khoảng trắng / xuống dòng → []', async () => {
    await writeFile(file, '  \n\r\n\t ');

    expect(await new JsonFileRepository(file).load()).toEqual([]);
  });
});
