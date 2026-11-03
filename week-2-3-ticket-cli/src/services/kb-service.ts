import { readFile } from 'node:fs/promises';
import { StorageError, ValidationError } from '../errors';
import type { KBClient } from '../kb/kb-client';
import {
  normalizeNodePath,
  parsePositiveInt,
  resolveTitle,
  type Document,
  type SearchResult,
} from '../models/kb';
import { normalizeTags } from '../models/ticket';

export interface SearchInput {
  query?: string;
  topK?: string;
}

export interface ListInput {
  node?: string;
  limit?: string;
  recursive?: boolean;
}

export interface AddInput {
  file?: string;
  path?: string;
  title?: string;
  tags?: string[];
}

/**
 * Validate và chuẩn hoá input của lệnh `kb` trước khi gọi KBClient (SPEC §4.1).
 * Client chỉ được tạo sau khi input hợp lệ, nên lỗi input luôn được báo trước lỗi cấu hình.
 */
export class KBService {
  constructor(private readonly getClient: () => KBClient) {}

  async search(input: SearchInput): Promise<SearchResult[]> {
    const query = input.query?.trim();
    if (!query) throw new ValidationError('query is required');
    const topK = parsePositiveInt(input.topK, '--top-k', 50, 5);
    return this.getClient().search({ query, topK });
  }

  async list(input: ListInput): Promise<Document[]> {
    if (input.node === undefined) throw new ValidationError('--node is required');
    const nodePath = normalizeNodePath(input.node);
    const limit = parsePositiveInt(input.limit, '--limit', 100, 10);
    return this.getClient().list({ nodePath, limit, recursive: input.recursive ?? false });
  }

  async retrieve(rawId: string | undefined): Promise<Document> {
    const id = rawId?.trim();
    if (!id) throw new ValidationError('document id is required');
    return this.getClient().retrieve(id);
  }

  async add(input: AddInput): Promise<Document> {
    if (!input.file) throw new ValidationError('--file is required');
    if (input.path === undefined) throw new ValidationError('--path is required');
    const nodePath = normalizeNodePath(input.path);
    const tags = normalizeTags(input.tags ?? []);

    const content = await readContent(input.file);
    const title = resolveTitle({ title: input.title, content, file: input.file });
    if (!title) throw new ValidationError('title is required');

    return this.getClient().add({ title, content, nodePath, tags });
  }
}

/** Đọc file UTF-8, bỏ BOM; không đọc được → StorageError, rỗng → ValidationError. */
async function readContent(file: string): Promise<string> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? 'unknown error';
    throw new StorageError(`cannot read ${file} (${code})`);
  }
  const content = text.replace(/^﻿/, '');
  if (!content.trim()) throw new ValidationError(`file ${file} is empty`);
  return content;
}
