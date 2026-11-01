import { ValidationError } from '../errors';

export interface NewTicketInput {
  title?: string;
  status?: string;
}

export function parseNewTicket(input: NewTicketInput) {
  const title = input.title?.trim();
  if (!title) throw new ValidationError('--title is required');
  if (input.status !== undefined) {
    throw new ValidationError(`invalid status "${input.status}". Allowed: open, in-progress, closed`);
  }
  return { title, status: 'open' };
}
