import { basename, extname } from 'node:path';
import { ValidationError } from '../errors';

/** Một tài liệu trong Knowledge Base (SPEC §4.3). */
export interface Document {
  id: string;
  title: string;
  content: string;
  nodePath: string;
  tags: string[];
}

/** Trường có độ ưu tiên cao nhất mà tài liệu khớp với query. */
export type MatchType = 'title' | 'tag' | 'content';

/** Một kết quả search. Chỉ gồm id, title, nodePath như response `/search` của API contract. */
export interface SearchResult {
  document: Pick<Document, 'id' | 'title' | 'nodePath'>;
  matchType: MatchType;
}

/** Truy vấn search. `filters` khai báo cho khớp đề, tuần 3 chưa dùng. */
export interface KBQuery {
  query: string;
  topK: number;
  filters?: { tags?: string[] };
}

export interface ListQuery {
  nodePath: string;
  limit: number;
  recursive: boolean;
}

export type NewDocument = Omit<Document, 'id'>;

/** Đưa văn bản về dạng chỉ dùng để so sánh: trim, chữ thường, bỏ dấu, đ → d. */
export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/** Chuẩn hoá đường dẫn node: bắt buộc bắt đầu bằng "/", gộp "//", bỏ "/" cuối (trừ gốc), giữ hoa thường. */
export function normalizeNodePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) {
    throw new ValidationError(`invalid node path "${raw}". Expected a path starting with "/"`);
  }
  const collapsed = trimmed.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed;
}

/** Đọc số nguyên dương từ option dạng chuỗi; không truyền thì trả mặc định. */
export function parsePositiveInt(raw: string | undefined, name: string, max: number, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const value = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || value > max) {
    throw new ValidationError(`invalid ${name} "${raw}". Expected an integer from 1 to ${max}`);
  }
  return value;
}

/** Title cho `kb add`: --title → dòng "# ..." đầu tiên trong file → tên file bỏ đuôi. Luôn trim. */
export function resolveTitle(input: { title?: string; content: string; file: string }): string {
  if (input.title !== undefined) return input.title.trim();
  const heading = /^#[ \t]+(.+)$/m.exec(input.content);
  if (heading?.[1]) return heading[1].trim();
  const name = basename(input.file);
  return name.slice(0, name.length - extname(name).length).trim();
}
