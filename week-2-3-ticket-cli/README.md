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
npm test            # unit + integration (114 test)
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

Lỗi in ra stderr dạng `Error: ...`, không in stack trace. Ngoại lệ: lỗi cú pháp do Commander phát hiện (lệnh hoặc option không tồn tại, thiếu giá trị option) giữ nguyên message gốc của Commander, ví dụ `error: unknown command 'fly'`, vẫn exit 2 (theo `docs/SPEC.md` mục 1). File JSON hỏng không bao giờ bị ghi đè.

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
- Quá trình dùng AI (Layered Questioning, Solution Exploration, T1 mình viết test, AI đề xuất Green, mình review; T2–T64 do AI agent, kiểm chứng): [`ai-usage/`](ai-usage/README.md).

#### Ghi chú về lịch sử commit

- **T1 không có commit đỏ riêng.** Test T1 được commit chung với phần dựng khung project trong `eca7fbe` (`docs(week-2): record design decisions and update spec`), trước commit xanh `013dddc`. Lịch sử giữ nguyên, không viết lại; log đỏ của T1 được tái tạo trên đúng cây file của `eca7fbe` (`evidence/T1-red.log`).
- **Một số log đỏ là "thiếu module/hàm", chưa phải sai assertion:** T1, T10, T12, T13, T16, T25, T27, T32 và nhóm `create` (T41–T48). Đây là vòng đầu tiên của một module hoặc một hàm mới, nên test đỏ vì API chưa tồn tại. Ngay vòng kế tiếp trên cùng module, test đỏ vì expected ≠ received (ví dụ T14, T17, T26). Chế độ ts-jest chỉ biên dịch (`DECISIONS.md` #2) được chọn để phần lớn test đỏ vì hành vi thay vì cả file không biên dịch được.

## Tuần 3 — Knowledge Base (lệnh `kb`)

Lệnh mới nằm trong cùng chương trình: `tickets kb search|list|retrieve|add`. Chi tiết hành vi: `docs/SPEC.md` Phần B; hướng dẫn dùng: `docs/USAGE.md` mục 12.

**Phạm vi đã thống nhất:** không dùng KB API thật của công ty. Phần "HTTP" chạy với một KB server tự viết theo API contract của đề, chạy trên máy (`npm run kb-server`).

- [x] Domain entities: `Document`, `SearchResult`, `KBQuery` (`src/models/kb.ts`)
- [x] `MockKBClient` + 4 lệnh chạy với mock
- [x] `HTTPKBClient` cùng hành vi với mock (cùng bộ contract test T75–T81)
- [x] Đổi client qua biến môi trường `KB_CLIENT=mock|http`
- [x] Integration test cho cả 2 client (HTTP chạy với KB server thật trong test, cổng ngẫu nhiên)
- [x] Sơ đồ kiến trúc + API contract (bên dưới và `docs/SPEC.md` §4.6)
- [x] Hướng dẫn chạy mock (dev) và HTTP (KB server local)

### Chạy nhanh

```powershell
# Mock (mặc định): dữ liệu seed 13 tài liệu trong bộ nhớ, không cần mạng
npm run tickets -- kb search "đăng nhập" --top-k 3
npm run tickets -- kb list --node /team --recursive
npm run tickets -- kb retrieve doc-008

# HTTP: terminal 1 bật KB server, terminal 2 đổi client
npm run kb-server                                   # http://localhost:4000
$env:KB_CLIENT = "http"                             # KB_API_URL mặc định http://localhost:4000
npm run tickets -- kb add --file evidence/week-3/sms-nhac-hoc-bu.md --path /templates/sms --tags sms
npm run tickets -- kb retrieve doc-014              # server còn giữ dữ liệu giữa các lần chạy CLI
```

### Kiến trúc

```
tickets kb ...  →  run()  →  KBService (validate + chuẩn hoá, đọc file của add)
                                  │
                                  ▼
                           KBClient (port: search / list / retrieve / add)
                             ├── MockKBClient  (trong bộ nhớ của tiến trình CLI)
                             └── HTTPKBClient  (fetch, POST JSON)
                                        │
                                        ▼
                             KB server local (npm run kb-server)
                             = HTTP adapter bọc một MockKBClient
```

```
src/models/kb.ts             Document, SearchResult, KBQuery...; normalize, normalizeNodePath, parsePositiveInt, resolveTitle
src/services/kb-service.ts   validate input, đọc file cho add; chỉ tạo client khi input hợp lệ
src/kb/kb-client.ts          port KBClient
src/kb/mock-kb-client.ts     KB trong bộ nhớ: search có xếp hạng, list theo node, sinh id
src/kb/http-kb-client.ts     POST JSON tới KB API, chuyển status/lỗi mạng thành lớp lỗi của CLI
src/kb/server.ts             KB server local theo API contract (node:http)
src/kb/config.ts             đọc KB_CLIENT / KB_API_URL, tạo client tương ứng
src/kb/seed.ts               13 tài liệu mẫu: template email/SMS/Teams, team DevOps/Support, hướng dẫn, runbook
src/kb-server.ts             điểm chạy của npm run kb-server
```

### API contract (KB server)

Mọi endpoint là `POST` với body JSON. Lỗi trả `{ "error": "..." }` với status 400 (body sai), 404 (không tìm thấy / endpoint lạ), 409 (trùng title).

| Endpoint | Body | Response |
|---|---|---|
| `/search` | `{ "query": "login", "topK": 5 }` | `{ "results": [{ "id", "title", "nodePath", "matchType" }] }` |
| `/list` | `{ "nodePath": "/templates/email", "limit": 10, "recursive": false }` | `{ "documents": [Document] }` |
| `/retrieve` | `{ "docId": "doc-001" }` | `{ "document": Document }` |
| `/add` | `{ "title", "content", "nodePath", "tags" }` | `201 { "document": Document }` |

### Test và bằng chứng

- 30 hành vi tự động T65–T94 (37 test, vì contract chạy cho cả 2 client); cả suite: 114 test, khoảng 4 s.
- Tuần này không commit theo từng vòng Red → Green: test cả Phần B được viết trước theo spec, chạy thấy đỏ (`evidence/week-3/01-red-before-code.log`), rồi mới code cho xanh (`evidence/week-3/03-green-after-code.log`).
- Kịch bản chạy tay T95 qua KB server: `evidence/week-3/02-e2e-kb-server.log`.
