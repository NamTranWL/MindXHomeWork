import { ConflictError, NotFoundError } from '../errors';
import { normalize, type Document, type KBQuery, type ListQuery, type MatchType, type NewDocument, type SearchResult } from '../models/kb';
import type { KBClient } from './kb-client';
import { SEED_DOCUMENTS } from './seed';

const SCORES: Record<MatchType, number> = { title: 3, tag: 2, content: 1 };

/**
 * KB trong bộ nhớ (SPEC §4.5). Dùng trực tiếp khi KB_CLIENT=mock và làm lõi cho KB server local.
 * Dữ liệu đầu vào được copy, nên add() không làm thay đổi seed hay fixture dùng chung.
 */
export class MockKBClient implements KBClient {
  private readonly docs: Document[];

  constructor(docs: readonly Document[] = SEED_DOCUMENTS) {
    this.docs = structuredClone([...docs]);
  }

  async search({ query, topK }: KBQuery): Promise<SearchResult[]> {
    const needle = normalize(query);
    const scored: Array<{ doc: Document; matchType: MatchType }> = [];
    for (const doc of this.docs) {
      const matchType = bestMatch(doc, needle);
      if (matchType) scored.push({ doc, matchType });
    }
    return scored
      .sort((a, b) => SCORES[b.matchType] - SCORES[a.matchType] || compareIds(a.doc.id, b.doc.id))
      .slice(0, topK)
      .map(({ doc, matchType }) => ({
        document: { id: doc.id, title: doc.title, nodePath: doc.nodePath },
        matchType,
      }));
  }

  async list({ nodePath, limit, recursive }: ListQuery): Promise<Document[]> {
    return this.docs
      .filter((doc) => inNode(doc.nodePath, nodePath, recursive))
      .sort((a, b) => compareIds(a.id, b.id))
      .slice(0, limit)
      .map((doc) => structuredClone(doc));
  }

  async retrieve(id: string): Promise<Document> {
    const doc = this.docs.find((d) => d.id === id);
    if (!doc) throw new NotFoundError(`document ${id} not found`);
    return structuredClone(doc);
  }

  async add(input: NewDocument): Promise<Document> {
    const title = normalize(input.title);
    const existing = this.docs.find((d) => d.nodePath === input.nodePath && normalize(d.title) === title);
    if (existing) {
      throw new ConflictError(
        `document "${input.title.trim()}" already exists at ${input.nodePath} (${existing.id})`,
      );
    }
    const doc: Document = { id: this.nextId(), ...structuredClone(input) };
    this.docs.push(doc);
    return structuredClone(doc);
  }

  /** max(số trong id) + 1, đệm 3 chữ số. */
  private nextId(): string {
    const max = Math.max(0, ...this.docs.map((d) => idNumber(d.id)));
    return `doc-${String(max + 1).padStart(3, '0')}`;
  }
}

function bestMatch(doc: Document, needle: string): MatchType | undefined {
  if (normalize(doc.title).includes(needle)) return 'title';
  if (doc.tags.some((tag) => normalize(tag).includes(needle))) return 'tag';
  if (normalize(doc.content).includes(needle)) return 'content';
  return undefined;
}

function inNode(docPath: string, node: string, recursive: boolean): boolean {
  if (docPath === node) return true;
  if (!recursive) return false;
  return node === '/' || docPath.startsWith(node + '/');
}

function idNumber(id: string): number {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

/** So id theo phần số trước (doc-010 sau doc-009), rồi theo chuỗi. */
function compareIds(a: string, b: string): number {
  return idNumber(a) - idNumber(b) || a.localeCompare(b);
}
