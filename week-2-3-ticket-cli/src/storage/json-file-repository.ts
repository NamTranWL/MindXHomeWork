import { readFile, writeFile } from 'node:fs/promises';
import { StorageError } from '../errors';
import type { Ticket } from '../models/ticket';
import type { TicketRepository } from '../services/ticket-service';

export class JsonFileRepository implements TicketRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Ticket[]> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    text = text.replace(/^\uFEFF/, '');
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
    await writeFile(this.filePath, JSON.stringify(tickets, null, 2) + '\n', 'utf8');
  }
}
