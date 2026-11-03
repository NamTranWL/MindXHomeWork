import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { StorageError, ValidationError } from '../../../src/errors';
import { KBService } from '../../../src/services/kb-service';
import { expectError, RecordingKBClient } from '../../helpers/kb';
import { makeTempDir, removeDir } from '../../helpers/cli';

/** Service với client giả; đếm số lần tạo client để kiểm "lỗi input thì không tạo client". */
function setup() {
  const client = new RecordingKBClient();
  let created = 0;
  const service = new KBService(() => {
    created++;
    return client;
  });
  return { client, service, createdCount: () => created };
}

describe('KBService.search', () => {
  it('T71: query rỗng → ValidationError, không tạo client; hợp lệ → query đã trim, topK mặc định 5', async () => {
    const { client, service, createdCount } = setup();

    await expectError(() => service.search({ query: '   ' }), ValidationError, 'query is required');
    await expectError(() => service.search({}), ValidationError, 'query is required');
    expect(createdCount()).toBe(0);

    await service.search({ query: '  login ' });
    await service.search({ query: 'login', topK: '3' });

    expect(client.calls).toEqual([
      { method: 'search', arg: { query: 'login', topK: 5 } },
      { method: 'search', arg: { query: 'login', topK: 3 } },
    ]);
  });
});

describe('KBService.list', () => {
  it('T72: thiếu node → lỗi, không tạo client; hợp lệ → node đã chuẩn hoá, limit 10, recursive false', async () => {
    const { client, service, createdCount } = setup();

    await expectError(() => service.list({}), ValidationError, '--node is required');
    await expectError(
      () => service.list({ node: 'templates' }),
      ValidationError,
      'invalid node path "templates". Expected a path starting with "/"',
    );
    await expectError(
      () => service.list({ node: '/x', limit: '0' }),
      ValidationError,
      'invalid --limit "0". Expected an integer from 1 to 100',
    );
    expect(createdCount()).toBe(0);

    await service.list({ node: '/templates//email/' });
    await service.list({ node: '/', limit: '2', recursive: true });

    expect(client.calls).toEqual([
      { method: 'list', arg: { nodePath: '/templates/email', limit: 10, recursive: false } },
      { method: 'list', arg: { nodePath: '/', limit: 2, recursive: true } },
    ]);
  });
});

describe('KBService.retrieve', () => {
  it('T73: id rỗng → lỗi, không tạo client; hợp lệ → id đã trim', async () => {
    const { client, service, createdCount } = setup();

    await expectError(() => service.retrieve('  '), ValidationError, 'document id is required');
    await expectError(() => service.retrieve(undefined), ValidationError, 'document id is required');
    expect(createdCount()).toBe(0);

    await service.retrieve(' doc-001 ');

    expect(client.calls).toEqual([{ method: 'retrieve', arg: 'doc-001' }]);
  });
});

describe('KBService.add', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(async () => {
    await removeDir(dir);
  });

  it('T74: thiếu --file/--path, file không có, file rỗng → lỗi và không tạo client; hợp lệ → dữ liệu đã chuẩn hoá', async () => {
    const { client, service, createdCount } = setup();
    const missing = join(dir, 'missing.md');
    const empty = join(dir, 'empty.md');
    const file = join(dir, 'sms.md');
    await writeFile(empty, ' \n\t\n', 'utf8');
    await writeFile(file, '﻿# SMS bảo trì\nHệ thống bảo trì lúc {time}.\n', 'utf8');

    await expectError(() => service.add({ path: '/x' }), ValidationError, '--file is required');
    await expectError(() => service.add({ file }), ValidationError, '--path is required');
    await expectError(() => service.add({ file: missing, path: '/x' }), StorageError, `cannot read ${missing} (ENOENT)`);
    await expectError(() => service.add({ file: empty, path: '/x' }), ValidationError, `file ${empty} is empty`);
    expect(createdCount()).toBe(0);

    await service.add({ file, path: '/templates//sms/', tags: ['SMS, sms ,maintenance'] });

    expect(client.calls).toEqual([
      {
        method: 'add',
        arg: {
          title: 'SMS bảo trì',
          content: '# SMS bảo trì\nHệ thống bảo trì lúc {time}.\n',
          nodePath: '/templates/sms',
          tags: ['sms', 'maintenance'],
        },
      },
    ]);
  });
});
