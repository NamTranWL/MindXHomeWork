import {
  normalizeTags,
  parseNewTicket,
  parsePriority,
  parseStatus,
  type NewTicketInput,
  type Status,
  type Ticket,
} from '../models/ticket';
import { NotFoundError } from '../errors';

export interface TicketRepository {
  load(): Promise<Ticket[]>;
  save(tickets: Ticket[]): Promise<void>;
}

export interface ListFilter {
  status?: string;
  priority?: string;
  tags?: string[];
}

function findOrThrow(tickets: Ticket[], id: number): Ticket {
  const found = tickets.find((t) => t.id === id);
  if (!found) throw new NotFoundError(`ticket #${id} not found`);
  return found;
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

  async get(id: number): Promise<Ticket> {
    const tickets = await this.repo.load();
    return findOrThrow(tickets, id);
  }

  async updateStatus(id: number, status: string): Promise<Ticket> {
    const tickets = await this.repo.load();
    const updated: Ticket = { ...findOrThrow(tickets, id), status: status as Status };
    await this.repo.save(tickets.map((t) => (t.id === id ? updated : t)));
    return updated;
  }
}
