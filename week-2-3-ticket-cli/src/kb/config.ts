import { ValidationError } from '../errors';
import { HTTPKBClient } from './http-kb-client';
import type { KBClient } from './kb-client';
import { MockKBClient } from './mock-kb-client';

export interface KBConfig {
  client: 'mock' | 'http';
  apiUrl: string;
}

const CLIENTS = ['mock', 'http'] as const;
const DEFAULT_API_URL = 'http://localhost:4000';

/** Đọc KB_CLIENT và KB_API_URL (SPEC §4.2). */
export function parseKBConfig(env: Record<string, string | undefined>): KBConfig {
  const client = env.KB_CLIENT ?? 'mock';
  if (!(CLIENTS as readonly string[]).includes(client)) {
    throw new ValidationError(`invalid KB_CLIENT "${client}". Allowed: ${CLIENTS.join(', ')}`);
  }

  const rawUrl = env.KB_API_URL ?? DEFAULT_API_URL;
  if (!isHttpUrl(rawUrl)) throw new ValidationError(`invalid KB_API_URL "${rawUrl}"`);

  return { client: client as KBConfig['client'], apiUrl: rawUrl.replace(/\/+$/, '') };
}

/** Tạo client theo biến môi trường: mock trong bộ nhớ hoặc HTTP tới KB server. */
export function createKBClient(env: Record<string, string | undefined>): KBClient {
  const config = parseKBConfig(env);
  return config.client === 'http' ? new HTTPKBClient(config.apiUrl) : new MockKBClient();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
