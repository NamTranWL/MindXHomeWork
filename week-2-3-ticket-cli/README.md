# Tuần 2–3 — Ticket Manager CLI + KB API

Đề bài: `MindXOnboarding/docs/plans/week-2/overview.md`, `week-3/{overview,architecture,tasks}.md`
Tech gợi ý: TypeScript, Commander.js, Jest, fetch/axios. Tham khảo slide Hexagonal Architecture.
Code đặt trực tiếp trong thư mục này (`package.json`, `src/`, `tests/`...).

## Tuần 2 — Ticket Manager CLI (lưu JSON)
Lệnh: `tickets create` · `tickets list` (filter status/priority/tags) · `tickets show <id>` · `tickets update <id>`
Kiến trúc: commands → services → models → JSON storage

- [ ] Quy trình TDD thể hiện qua lịch sử commit: test fail → implement → pass → refactor
- [ ] 4 lệnh hoạt động
- [ ] Unit test: logic ticket & validation
- [ ] Integration test: JSON storage & hành vi lệnh CLI
- [ ] Test lỗi: input sai, ticket không tồn tại, file JSON thiếu/hỏng
- [ ] Hướng dẫn setup: cài đặt, cấu hình, sử dụng

## Tuần 3 — KB API
Lệnh: `kb search "q" --top-k 3` · `kb list --node /templates/email --limit 10` · `kb retrieve doc-001` · `kb add --file x.md --path /templates/sms --tags sms`
Kiến trúc: CLI → `KBClient` interface → `MockKBClient` (2–3 docs) | `HTTPKBClient` (POST /search /list /retrieve /add)

- [ ] Domain entities: Document, SearchResult, KBQuery
- [ ] MockKBClient + 4 lệnh chạy với mock
- [ ] HTTPKBClient cùng hành vi với mock
- [ ] Đổi client qua biến môi trường
- [ ] Integration test cho cả 2 client
- [ ] Sơ đồ kiến trúc + API contract
- [ ] Hướng dẫn chạy mock (dev) và HTTP (prod)

**Cần Sys Admin/DevOps:** quyền truy cập KB API server.
