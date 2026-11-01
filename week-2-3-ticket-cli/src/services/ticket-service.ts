import { parseNewTicket, type NewTicketInput, type Ticket } from '../models/ticket';

export interface TicketRepository {
  load(): Promise<Ticket[]>;
  save(tickets: Ticket[]): Promise<void>;
}

export class TicketService {
  constructor(private readonly repo: TicketRepository) {}

  async create(input: NewTicketInput): Promise<Ticket> {
    const data = parseNewTicket(input);
    const tickets = await this.repo.load();
    const created: Ticket = { id: 1, ...data };
    await this.repo.save([...tickets, created]);
    return created;
  }
}
