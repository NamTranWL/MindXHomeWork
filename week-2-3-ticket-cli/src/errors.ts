export class ValidationError extends Error {}

export class NotFoundError extends Error {}

export class StorageError extends Error {}

/** Trùng dữ liệu, ví dụ thêm tài liệu KB trùng title trong cùng node (exit 1). */
export class ConflictError extends Error {}

/** Lỗi khi gọi KB API: không kết nối được, server lỗi, response sai dạng (exit 1). */
export class KBApiError extends Error {}
