import { readFile } from 'node:fs/promises';
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
    text = text.replace(/^﻿/, '');
    if (text.trim() === '') return [];
    return JSON.parse(text);
  }

  async save(_tickets: Ticket[]): Promise<void> {}
}
