import { ValidationError } from '../errors';

export interface NewTicketInput {
  title?: string;
}

export function parseNewTicket(_input: NewTicketInput) {
  throw new ValidationError('--title is required');
}
