import { ValidationError } from '../errors';

const STATUSES = ['open', 'in-progress', 'closed'] as const;
export type Status = (typeof STATUSES)[number];

const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface NewTicketInput {
  title?: string;
  status?: string;
  priority?: string;
  description?: string;
}

function oneOf<T extends string>(field: string, allowed: readonly T[], value: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`invalid ${field} "${value}". Allowed: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function parseStatus(value: string): Status {
  return oneOf('status', STATUSES, value);
}

export function parsePriority(value: string): Priority {
  return oneOf('priority', PRIORITIES, value);
}

export function parseNewTicket(input: NewTicketInput) {
  const title = input.title?.trim();
  if (!title) throw new ValidationError('--title is required');
  return {
    title,
    status: parseStatus(input.status ?? 'open'),
    priority: parsePriority(input.priority ?? 'medium'),
    description: input.description ?? '',
    tags: [] as string[],
  };
}

export function normalizeTags(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values.flatMap((v) => v.split(','))) {
    const tag = value.trim().toLowerCase();
    if (tag && !result.includes(tag)) result.push(tag);
  }
  return result;
}
