import type { Ticket } from '../models/ticket';

export function formatLine(ticket: Ticket): string {
  const tags = ticket.tags.length > 0 ? ` (tags: ${ticket.tags.join(', ')})` : '';
  return `#${ticket.id} [${ticket.status}] [${ticket.priority}] ${ticket.title}${tags}\n`;
}

export function formatDetails(ticket: Ticket): string {
  return [
    `ID: ${ticket.id}`,
    `Title: ${ticket.title}`,
    `Description: ${ticket.description || '-'}`,
    `Status: ${ticket.status}`,
    `Priority: ${ticket.priority}`,
    `Tags: ${ticket.tags.length > 0 ? ticket.tags.join(', ') : '-'}`,
  ]
    .map((line) => line + '\n')
    .join('');
}
