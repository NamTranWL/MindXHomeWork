import type { Ticket } from '../../src/models/ticket';
import type { TicketRepository } from '../../src/services/ticket-service';

/** Repository giả trong bộ nhớ: đếm số lần đọc và ghi lại từng lần lưu. */
export class InMemoryTicketRepository implements TicketRepository {
  loadCalls = 0;
  saves: Ticket[][] = [];
  private tickets: Ticket[];

  constructor(tickets: Ticket[] = []) {
    this.tickets = structuredClone(tickets);
  }

  async load(): Promise<Ticket[]> {
    this.loadCalls++;
    return structuredClone(this.tickets);
  }

  async save(tickets: Ticket[]): Promise<void> {
    this.saves.push(structuredClone(tickets));
    this.tickets = structuredClone(tickets);
  }
}

export function ticket(fields: Partial<Ticket> & { id: number }): Ticket {
  return {
    title: `Ticket ${fields.id}`,
    description: '',
    status: 'open',
    priority: 'medium',
    tags: [],
    ...fields,
  };
}
