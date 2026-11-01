import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonFileRepository } from '../../../src/storage/json-file-repository';
import { ticket } from '../../helpers/in-memory-repository';
import { StorageError } from '../../../src/errors';

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

  it('T35: file có BOM UTF-8 và JSON hợp lệ → đọc bình thường', async () => {
    const tickets = [ticket({ id: 1, title: 'Login lỗi 500', tags: ['lms'] })];
    await writeFile(file, '\uFEFF' + JSON.stringify(tickets), 'utf8');

    expect(await new JsonFileRepository(file).load()).toEqual(tickets);
  });

  it('T36: nội dung không phải JSON → StorageError, file giữ nguyên nội dung', async () => {
    await writeFile(file, '{ not json', 'utf8');

    const promise = new JsonFileRepository(file).load();

    await expect(promise).rejects.toThrow(StorageError);
    await expect(promise).rejects.toThrow(exactly(`cannot read ${file} (invalid JSON)`));
    expect(await readFile(file, 'utf8')).toBe('{ not json');
  });

  it('T37: JSON hợp lệ nhưng không phải mảng ({}) → StorageError, file giữ nguyên', async () => {
    await writeFile(file, '{}', 'utf8');

    const promise = new JsonFileRepository(file).load();

    await expect(promise).rejects.toThrow(StorageError);
    await expect(promise).rejects.toThrow(exactly(`cannot read ${file} (expected a JSON array)`));
    expect(await readFile(file, 'utf8')).toBe('{}');
  });

  it('T38: ghi rồi đọc lại → cùng dữ liệu (round-trip)', async () => {
    const tickets = [ticket({ id: 1, title: 'Login lỗi 500', tags: ['lms'] }), ticket({ id: 2 })];

    await new JsonFileRepository(file).save(tickets);

    expect(await new JsonFileRepository(file).load()).toEqual(tickets);
  });
});
