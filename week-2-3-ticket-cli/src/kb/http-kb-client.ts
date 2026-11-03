import { ConflictError, KBApiError, NotFoundError, ValidationError } from '../errors';
import type { Document, KBQuery, ListQuery, MatchType, NewDocument, SearchResult } from '../models/kb';
import type { KBClient } from './kb-client';

type Endpoint = '/search' | '/list' | '/retrieve' | '/add';

/** Gọi KB API qua HTTP: mọi endpoint là POST JSON (SPEC §4.6). */
export class HTTPKBClient implements KBClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async search({ query, topK }: KBQuery): Promise<SearchResult[]> {
    const body = await this.post('/search', { query, topK });
    const results = field(body, 'results');
    if (!Array.isArray(results) || !results.every(isSearchItem)) throw unexpected('/search');
    return results.map(({ id, title, nodePath, matchType }) => ({ document: { id, title, nodePath }, matchType }));
  }

  async list({ nodePath, limit, recursive }: ListQuery): Promise<Document[]> {
    const body = await this.post('/list', { nodePath, limit, recursive });
    const documents = field(body, 'documents');
    if (!Array.isArray(documents) || !documents.every(isDocument)) throw unexpected('/list');
    return documents;
  }

  async retrieve(id: string): Promise<Document> {
    return this.documentFrom('/retrieve', await this.post('/retrieve', { docId: id }));
  }

  async add(doc: NewDocument): Promise<Document> {
    const { title, content, nodePath, tags } = doc;
    return this.documentFrom('/add', await this.post('/add', { title, content, nodePath, tags }));
  }

  private documentFrom(endpoint: Endpoint, body: unknown): Document {
    const document = field(body, 'document');
    if (!isDocument(document)) throw unexpected(endpoint);
    return document;
  }

  /** Gửi request, chuyển lỗi mạng và status lỗi thành lớp lỗi của CLI, trả về body JSON khi 2xx. */
  private async post(endpoint: Endpoint, payload: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new KBApiError(`cannot reach KB API at ${this.baseUrl} (${networkCode(error)})`);
    }

    const body = await response.json().catch(() => undefined);
    if (response.ok) {
      if (body === undefined) throw unexpected(endpoint);
      return body;
    }

    const message = field(body, 'error');
    const serverMessage = typeof message === 'string' ? message : undefined;
    if (response.status === 400) throw new ValidationError(serverMessage ?? 'invalid request');
    if (response.status === 404 && serverMessage) throw new NotFoundError(serverMessage);
    if (response.status === 409 && serverMessage) throw new ConflictError(serverMessage);
    throw new KBApiError(`KB API error (${response.status})`);
  }
}

function unexpected(endpoint: Endpoint): KBApiError {
  return new KBApiError(`unexpected response from KB API (${endpoint})`);
}

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
}

/** Lấy mã lỗi mạng (ECONNREFUSED, ENOTFOUND...) từ lỗi fetch của Node. */
function networkCode(error: unknown): string {
  const cause = field(error, 'cause');
  const code = field(cause, 'code') ?? field(error, 'code');
  return typeof code === 'string' ? code : 'network error';
}

const MATCH_TYPES: readonly string[] = ['title', 'tag', 'content'];

function isSearchItem(value: unknown): value is { id: string; title: string; nodePath: string; matchType: MatchType } {
  return (
    ['id', 'title', 'nodePath'].every((key) => typeof field(value, key) === 'string') &&
    MATCH_TYPES.includes(field(value, 'matchType') as string)
  );
}

function isDocument(value: unknown): value is Document {
  const tags = field(value, 'tags');
  return (
    ['id', 'title', 'content', 'nodePath'].every((key) => typeof field(value, key) === 'string') &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === 'string')
  );
}
