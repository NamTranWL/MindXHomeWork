import type { Ticket } from '../models/ticket';
import type { TicketRepository } from '../services/ticket-service';

export class JsonFileRepository implements TicketRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Ticket[]> {
    return [];
  }

  async save(_tickets: Ticket[]): Promise<void> {}
}
