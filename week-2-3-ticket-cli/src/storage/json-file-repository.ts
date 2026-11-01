import { randomBytes } from 'node:crypto';
import { readFile, rename as fsRename, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { StorageError } from '../errors';
import type { Ticket } from '../models/ticket';
import type { TicketRepository } from '../services/ticket-service';

type RenameFn = (from: string, to: string) => Promise<void>;

export interface JsonFileRepositoryOptions {
  /** Thay thế fs.rename (dùng trong test để giả lập lỗi khoá file trên Windows). */
  rename?: RenameFn;
  /** Thời gian chờ trước mỗi lần thử lại rename. */
  retryDelaysMs?: number[];
}

const RETRYABLE_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);

export class JsonFileRepository implements TicketRepository {
  private readonly rename: RenameFn;
  private readonly retryDelaysMs: number[];

  constructor(
    private readonly filePath: string,
    options: JsonFileRepositoryOptions = {},
  ) {
    this.rename = options.rename ?? fsRename;
    this.retryDelaysMs = options.retryDelaysMs ?? [50, 100, 200];
  }

  async load(): Promise<Ticket[]> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    text = text.replace(/^﻿/, '');
    if (text.trim() === '') return [];
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new StorageError(`cannot read ${this.filePath} (invalid JSON)`);
    }
    if (!Array.isArray(data)) {
      throw new StorageError(`cannot read ${this.filePath} (expected a JSON array)`);
    }
    return data;
  }

  async save(tickets: Ticket[]): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tempPath, JSON.stringify(tickets, null, 2) + '\n', 'utf8');
    await this.renameWithRetry(tempPath, this.filePath);
  }

  private async renameWithRetry(from: string, to: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        await this.rename(from, to);
        return;
      } catch (error) {
        const delay = this.retryDelaysMs[attempt];
        const code = (error as NodeJS.ErrnoException).code ?? '';
        if (delay === undefined || !RETRYABLE_CODES.has(code)) throw error;
        await sleep(delay);
      }
    }
  }
}
