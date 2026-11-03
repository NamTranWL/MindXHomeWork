import { createServer, type AddressInfo } from 'node:net';
import type { Document, KBQuery, ListQuery, NewDocument, SearchResult } from '../../src/models/kb';
import type { KBClient } from '../../src/kb/kb-client';
import { MockKBClient } from '../../src/kb/mock-kb-client';
import { createKBServer } from '../../src/kb/server';
import { KB_FIXTURE } from '../fixtures/kb-documents';

/** Chạy hàm (đồng bộ hoặc async) và trả về lỗi nó ném ra; không ném thì làm test fail. */
export async function errorOf(fn: () => unknown): Promise<Error> {
  try {
    await fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected function to throw');
}

/** Kiểm cùng lúc lớp lỗi và message. */
export async function expectError(
  fn: () => unknown,
  errorClass: new (...args: never[]) => Error,
  message: string,
): Promise<void> {
  const error = await errorOf(fn);
  expect(error).toBeInstanceOf(errorClass);
  expect(error.message).toBe(message);
}

/** Client giả cho test KBService: ghi lại lời gọi, trả về giá trị cố định. */
export class RecordingKBClient implements KBClient {
  calls: Array<{ method: string; arg: unknown }> = [];

  async search(query: KBQuery): Promise<SearchResult[]> {
    this.calls.push({ method: 'search', arg: query });
    return [];
  }

  async list(query: ListQuery): Promise<Document[]> {
    this.calls.push({ method: 'list', arg: query });
    return [];
  }

  async retrieve(id: string): Promise<Document> {
    this.calls.push({ method: 'retrieve', arg: id });
    return { id, title: 't', content: 'c', nodePath: '/x', tags: [] };
  }

  async add(doc: NewDocument): Promise<Document> {
    this.calls.push({ method: 'add', arg: doc });
    return { id: 'doc-100', ...doc };
  }
}

/** Lấy một cổng chắc chắn không có ai nghe: mở ở cổng ngẫu nhiên rồi đóng lại. */
export async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

export interface RunningKBServer {
  url: string;
  close: () => Promise<void>;
}

/** Bật KB server local ở cổng ngẫu nhiên với dữ liệu cho trước (mặc định là fixture). */
export async function startKBServer(docs: readonly Document[] = KB_FIXTURE): Promise<RunningKBServer> {
  const server = createKBServer(new MockKBClient(docs));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
