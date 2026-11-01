import { ValidationError } from '../errors';

export interface NewTicketInput {
  title?: string;
}

export function parseNewTicket(input: NewTicketInput) {
  const title = input.title?.trim();
  if (!title) throw new ValidationError('--title is required');
  return { title };
}
