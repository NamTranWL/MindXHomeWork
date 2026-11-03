import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { KBClient } from './kb-client';

type Body = Record<string, unknown>;
type Handler = (client: KBClient, body: Body) => Promise<{ status: number; json: unknown }>;

/**
 * KB server local theo API contract (SPEC §4.6). Chỉ làm việc của HTTP: đọc body, kiểm kiểu trường,
 * gọi KBClient lõi, chuyển kết quả và lỗi thành JSON + status code. Dữ liệu nằm trong bộ nhớ.
 */
export function createKBServer(client: KBClient): Server {
  return createServer((req, res) => {
    handle(client, req, res).catch((error: unknown) => {
      send(res, 500, { error: error instanceof Error ? error.message : 'internal error' });
    });
  });
}

const HANDLERS: Record<string, Handler> = {
  '/search': async (client, body) => {
    const query = requireString(body, 'query');
    const topK = requireNumber(body, 'topK');
    const results = await client.search({ query, topK });
    return { status: 200, json: { results: results.map((r) => ({ ...r.document, matchType: r.matchType })) } };
  },
  '/list': async (client, body) => {
    const nodePath = requireString(body, 'nodePath');
    const limit = requireNumber(body, 'limit');
    const recursive = body.recursive === undefined ? false : requireBoolean(body, 'recursive');
    return { status: 200, json: { documents: await client.list({ nodePath, limit, recursive }) } };
  },
  '/retrieve': async (client, body) => {
    return { status: 200, json: { document: await client.retrieve(requireString(body, 'docId')) } };
  },
  '/add': async (client, body) => {
    const doc = {
      title: requireString(body, 'title'),
      content: requireString(body, 'content'),
      nodePath: requireString(body, 'nodePath'),
      tags: requireStringArray(body, 'tags'),
    };
    return { status: 201, json: { document: await client.add(doc) } };
  },
};

async function handle(client: KBClient, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const handler = HANDLERS[path];
  if (req.method !== 'POST' || !handler) {
    send(res, 404, { error: `unknown endpoint ${req.method} ${path}` });
    return;
  }

  try {
    const body = parseBody(await readBody(req));
    const { status, json } = await handler(client, body);
    send(res, status, json);
  } catch (error) {
    if (error instanceof ValidationError) send(res, 400, { error: error.message });
    else if (error instanceof NotFoundError) send(res, 404, { error: error.message });
    else if (error instanceof ConflictError) send(res, 409, { error: error.message });
    else throw error;
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function parseBody(text: string): Body {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ValidationError('request body must be valid JSON');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('request body must be a JSON object');
  }
  return value as Body;
}

function requireString(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== 'string') throw new ValidationError(`"${key}" must be a string`);
  return value;
}

function requireNumber(body: Body, key: string): number {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ValidationError(`"${key}" must be a positive integer`);
  }
  return value;
}

function requireBoolean(body: Body, key: string): boolean {
  const value = body[key];
  if (typeof value !== 'boolean') throw new ValidationError(`"${key}" must be a boolean`);
  return value;
}

function requireStringArray(body: Body, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new ValidationError(`"${key}" must be an array of strings`);
  }
  return value;
}

function send(res: ServerResponse, status: number, json: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(json));
}
