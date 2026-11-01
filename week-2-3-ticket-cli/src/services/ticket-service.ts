import {
  normalizeTags,
  parseNewTicket,
  parsePriority,
  parseStatus,
  type NewTicketInput,
  type Ticket,
} from '../models/ticket';

export interface TicketRepository {
  load(): Promise<Ticket[]>;
  save(tickets: Ticket[]): Promise<void>;
}

export interface ListFilter {
  status?: string;
  priority?: string;
  tags?: string[];
}

export class TicketService {
  constructor(private readonly repo: TicketRepository) {}

  async create(input: NewTicketInput): Promise<Ticket> {
    const data = parseNewTicket(input);
    const tickets = await this.repo.load();
    const created: Ticket = { id: Math.max(0, ...tickets.map((t) => t.id)) + 1, ...data };
    await this.repo.save([...tickets, created]);
    return created;
  }

  async list(filter: ListFilter = {}): Promise<Ticket[]> {
    const status = filter.status === undefined ? undefined : parseStatus(filter.status);
    const priority = filter.priority === undefined ? undefined : parsePriority(filter.priority);
    const tags = normalizeTags(filter.tags ?? []);
    const tickets = await this.repo.load();
    return tickets
      .filter((t) => status === undefined || t.status === status)
      .filter((t) => priority === undefined || t.priority === priority)
      .filter((t) => tags.every((tag) => t.tags.includes(tag)))
      .sort((a, b) => a.id - b.id);
  }

  async get(id: number): Promise<Ticket | undefined> {
    const tickets = await this.repo.load();
    return tickets.find((t) => t.id === id);
  }
}
