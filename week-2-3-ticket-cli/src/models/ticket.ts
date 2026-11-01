import { ValidationError } from '../errors';

const STATUSES = ['open', 'in-progress', 'closed'] as const;
export type Status = (typeof STATUSES)[number];

const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface NewTicketInput {
  title?: string;
  status?: string;
  priority?: string;
}

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function parseNewTicket(input: NewTicketInput) {
  const title = input.title?.trim();
  if (!title) throw new ValidationError('--title is required');
  const status = input.status ?? 'open';
  if (!isStatus(status)) {
    throw new ValidationError(`invalid status "${status}". Allowed: ${STATUSES.join(', ')}`);
  }
  const priority = input.priority ?? 'medium';
  if (!isPriority(priority)) {
    throw new ValidationError(`invalid priority "${priority}". Allowed: ${PRIORITIES.join(', ')}`);
  }
  return { title, status, priority };
}
