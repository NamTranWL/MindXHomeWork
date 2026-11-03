import type { Document, SearchResult } from '../models/kb';
import type { Ticket } from '../models/ticket';

const tagsOrDash = (tags: string[]) => (tags.length > 0 ? tags.join(', ') : '-');

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
    `Tags: ${tagsOrDash(ticket.tags)}`,
  ]
    .map((line) => line + '\n')
    .join('');
}

/** `kb search`: `<id> <nodePath> <title> (match: <matchType>)`. */
export function formatSearchResult({ document, matchType }: SearchResult): string {
  return `${document.id} ${document.nodePath} ${document.title} (match: ${matchType})\n`;
}

/** `kb list`: `<id> <nodePath> <title>`, thêm ` (tags: a, b)` nếu có tag. */
export function formatDocumentLine(doc: Document): string {
  const tags = doc.tags.length > 0 ? ` (tags: ${doc.tags.join(', ')})` : '';
  return `${doc.id} ${doc.nodePath} ${doc.title}${tags}\n`;
}

/** `kb retrieve`: 4 dòng thông tin, dòng trống, rồi content nguyên văn (luôn kết thúc bằng xuống dòng). */
export function formatDocumentDetails(doc: Document): string {
  const header = [`ID: ${doc.id}`, `Title: ${doc.title}`, `Node: ${doc.nodePath}`, `Tags: ${tagsOrDash(doc.tags)}`];
  const content = doc.content.endsWith('\n') ? doc.content : `${doc.content}\n`;
  return `${header.join('\n')}\n\n${content}`;
}
