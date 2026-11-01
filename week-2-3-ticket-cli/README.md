# Tuần 2–3 — Ticket Manager CLI + KB API

Đề bài: `MindXOnboarding/docs/plans/week-2/overview.md`, `week-3/{overview,architecture,tasks}.md`
Tech gợi ý: TypeScript, Commander.js, Jest, fetch/axios. Tham khảo slide Hexagonal Architecture.
Code đặt trực tiếp trong thư mục này (`package.json`, `src/`, `tests/`...).

## Tuần 2 — Ticket Manager CLI (lưu JSON)
Lệnh: `tickets create` · `tickets list` (filter status/priority/tags) · `tickets show <id>` · `tickets update <id>`
Kiến trúc: commands → services → models → JSON storage

- [x] Quy trình TDD thể hiện qua lịch sử commit: test fail → implement → pass → refactor
- [x] 4 lệnh hoạt động
- [x] Unit test: logic ticket & validation
- [x] Integration test: JSON storage & hành vi lệnh CLI
- [x] Test lỗi: input sai, ticket không tồn tại, file JSON thiếu/hỏng
- [x] Hướng dẫn setup: cài đặt, cấu hình, sử dụng

### Cài đặt

Cần Node >= 20 (đã chạy với Node 22). Chạy trong thư mục `week-2-3-ticket-cli`:

```powershell
npm install
npm test            # unit + integration (77 test)
npm run typecheck   # kiểm tra kiểu bằng tsc --noEmit
npm run build       # biên dịch ra dist/
```

Chạy CLI:

- Không cần build: `npm run tickets -- list`
- Dùng lệnh `tickets` ở mọi nơi: `npm run build` rồi `npm link` (npm tạo sẵn file `.cmd` cho Windows)

### Cấu hình

| Biến môi trường | Ý nghĩa | Mặc định |
|---|---|---|
| `TICKETS_FILE` | Đường dẫn file JSON chứa ticket. Thư mục cha được tự tạo khi ghi | `./tickets.json` (theo thư mục hiện tại) |

```powershell
$env:TICKETS_FILE = "$HOME\tickets.json"
# PowerShell 5.1 hiển thị tiếng Việt sai thì chạy thêm:
[Console]::OutputEncoding = [Text.Encoding]::UTF8
```

### Sử dụng

Hướng dẫn đầy đủ (mọi option, output, thông báo lỗi, xử lý sự cố): `docs/USAGE.md`.

```powershell
tickets create --title "Login lỗi 500" --priority high --tags "LMS, login"
# Created ticket #1
tickets create --title "Trang chủ chậm" --description "Mất 8s" --status in-progress --tags perf --tags lms
tickets list                                   # tất cả, theo id tăng dần
tickets list --status open --priority high     # các điều kiện kết hợp AND
tickets list --tags lms,login                  # phải có đủ mọi tag; không phân biệt hoa thường
tickets show 1
tickets update 1 --status closed
# Updated ticket #1: status = closed
```

| Field | Giá trị hợp lệ | Mặc định |
|---|---|---|
| `--status` | `open`, `in-progress`, `closed` | `open` |
| `--priority` | `low`, `medium`, `high` | `medium` |
| `--tags` | Phân cách bằng dấu phẩy, truyền nhiều lần thì gộp; được trim, đưa về chữ thường, bỏ trùng | không có |

| Exit code | Khi nào |
|---|---|
| `0` | Thành công (kể cả `list` rỗng) |
| `1` | Không tìm thấy ticket, file JSON hỏng hoặc sai cấu trúc, lỗi đọc/ghi file |
| `2` | Input sai: thiếu/sai title, status, priority, id; thiếu `--status`; lệnh hoặc option không tồn tại |

Lỗi in ra stderr dạng `Error: ...`, không in stack trace. File JSON hỏng không bao giờ bị ghi đè.

### Kiến trúc

```
src/cli.ts                       tiến trình thật: gọi run(), đặt process.exitCode
src/commands/run.ts              Commander, map lỗi -> exit code (chỉ ở đây)
src/commands/format.ts           định dạng output của list/show
src/services/ticket-service.ts   create / list / get / updateStatus; định nghĩa port TicketRepository
src/models/ticket.ts             kiểu Ticket, validate và chuẩn hoá input, parseTicketId, normalizeTags
src/storage/json-file-repository.ts  adapter file JSON: BOM, file rỗng, ghi file tạm rồi rename (có retry trên Windows)
src/errors.ts                    ValidationError (exit 2), NotFoundError, StorageError (exit 1)
```

### Test và bằng chứng TDD

- `tests/unit`: model (validation, chuẩn hoá) và service (dùng repository giả trong bộ nhớ).
- `tests/integration/storage`: file thật trong thư mục tạm.
- `tests/integration/commands`: chạy `run()` trong cùng tiến trình; T41, T44, T54, T56, T63, T64 chạy tiến trình con thật (`node --import tsx src/cli.ts`) để kiểm exit code, stdout/stderr và việc không lộ stack trace.
- Mỗi hành vi `Tn` trong `docs/SPEC.md` có commit `test(...) (red)` rồi `feat(...) (green)`; test xanh ngay khi viết được ghi `(passes immediately)`. Log đỏ nằm trong `evidence/`.
- Quyết định thiết kế và lý do: `docs/DECISIONS.md`.

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
