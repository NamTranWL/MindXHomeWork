import type { Document, KBQuery, ListQuery, NewDocument, SearchResult } from '../models/kb';

/**
 * Port của Knowledge Base (SPEC §4.1). Nhận input đã được KBService validate và chuẩn hoá.
 * Client chỉ lo luật dữ liệu: không tìm thấy (NotFoundError), trùng title (ConflictError).
 */
export interface KBClient {
  search(query: KBQuery): Promise<SearchResult[]>;
  list(query: ListQuery): Promise<Document[]>;
  retrieve(id: string): Promise<Document>;
  add(doc: NewDocument): Promise<Document>;
}
