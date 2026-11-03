# Ticket Manager CLI — Đặc tả hành vi (tuần 2–3)

Tài liệu này là danh sách hành vi cần test trước khi implement. Phần A: mỗi hành vi `Tn` tương ứng một vòng Red → Green → Refactor. Phần B: viết test theo từng nhóm trước, rồi code cho xanh.
Ký hiệu `(#n)` = test case có từ §4.1 `TDD-Research.md` (tuần 1).

- **Phần A (mục 1–3):** lệnh `tickets` — tuần 2, đã chốt.
- **Phần B (mục 4–6):** lệnh `kb` gọi Knowledge Base (mock trong bộ nhớ hoặc KB server chạy trên máy) — tuần 3. Cơ sở nghiên cứu: `docs/KB-RESEARCH.md`.

## 1. Quyết định đã chốt

Công nghệ và lý do chọn: xem `docs/DECISIONS.md`. Tóm tắt: TypeScript (CommonJS), Jest + ts-jest, Commander.js, `tsx` cho test subprocess.

### Dữ liệu
| Field | Kiểu | Bắt buộc | Mặc định | Ràng buộc |
|---|---|---|---|---|
| `id` | number | tự sinh | `max(id) + 1`, danh sách rỗng thì `1` | số nguyên dương |
| `title` | string | có | — | trim hai đầu; rỗng hoặc chỉ khoảng trắng là lỗi |
| `description` | string | không | `""` | — |
| `status` | string | không | `open` | `open \| in-progress \| closed` |
| `priority` | string | không | `medium` | `low \| medium \| high` |
| `tags` | string[] | không | `[]` | đã chuẩn hoá (xem dưới) |

Tuần này không có `createdAt` / `updatedAt`.

### Tags
- Nhập bằng `--tags a,b`. Truyền lặp lại thì **gộp**: `--tags a,b --tags c` → `["a","b","c"]`.
- Chuẩn hoá: tách theo dấu phẩy → trim → lowercase → bỏ phần tử rỗng → bỏ trùng (giữ thứ tự xuất hiện đầu tiên).
- Khoảng trắng bên trong tag được giữ nguyên. Tag không thể chứa dấu phẩy.

### Lọc (`list`)
- Mọi điều kiện kết hợp theo **AND**: status, priority và từng tag.
- Nhiều tag: ticket phải có **tất cả** tag được lọc.
- Giá trị filter tags được chuẩn hoá như khi tạo (`--tags LMS` khớp `lms`).
- `--tags` trong filter truyền lặp lại thì gộp; sau chuẩn hoá còn rỗng (`--tags ""`) thì không lọc theo tag.
- Giá trị status/priority không hợp lệ trong filter là lỗi input (exit 2).
- Kết quả sắp theo `id` tăng dần.

### Cập nhật (`update`)
- Chỉ đổi `status`; `--status` bắt buộc, do model/service tự validate (không dùng `requiredOption`).
- Chuyển tự do giữa ba trạng thái; đổi sang đúng status hiện tại vẫn thành công.

### Validation
- Validate input trước, đọc file sau: lỗi input luôn ra exit 2, kể cả khi file hỏng.
- ID hợp lệ khớp `^[1-9]\d*$`: `abc`, `0`, `-1`, `1.5`, `01`, ` 1`, `1e2`, `0x10` đều sai.
- `status` và `priority` phân biệt hoa thường (`OPEN` là sai).
- `description` không trim.

### File lưu trữ
- Đường dẫn lấy từ biến môi trường `TICKETS_FILE`; không đặt thì dùng `./tickets.json` (theo thư mục hiện tại).
- Đọc:
  - File không tồn tại → danh sách rỗng.
  - File 0 byte hoặc chỉ có khoảng trắng → danh sách rỗng.
  - BOM UTF-8 được bỏ trước khi parse.
  - Nội dung không phải JSON → lỗi, **không ghi đè**.
  - JSON hợp lệ nhưng cấp ngoài cùng không phải mảng → coi như hỏng, **không ghi đè**. Không kiểm từng field của phần tử.
- Ghi:
  - Thư mục cha chưa tồn tại → tự tạo (recursive).
  - Ghi file tạm cùng thư mục rồi rename; không để lại file tạm.
  - Rename lỗi `EPERM` / `EACCES` / `EBUSY` → thử lại tối đa 3 lần (chờ 50, 100, 200 ms). Vẫn lỗi → xoá file tạm, lỗi I/O (exit 1), file gốc giữ nguyên.
  - JSON thụt lề 2 khoảng trắng, có xuống dòng cuối file.
- Lệnh chỉ đọc (`list`, `show`) không tạo và không sửa file.

### Exit code và output
| Exit | Khi nào |
|---|---|
| `0` | Thành công (kể cả `list` rỗng) |
| `1` | Lỗi lúc chạy: không tìm thấy ticket, file JSON hỏng hoặc sai cấu trúc, lỗi I/O |
| `2` | Input sai: thiếu/sai title, status, priority, id; thiếu `--status`; lệnh hoặc option không tồn tại |

- Thành công: kết quả ra stdout, stderr rỗng.
- Lỗi: message ra stderr, stdout rỗng, không in stack trace.
- `--title` là option thường; thiếu title do model/service tự validate (không dùng `requiredOption`).
- Lỗi dùng 3 lớp: `ValidationError` → exit 2, `NotFoundError` → exit 1, `StorageError` → exit 1. Chỉ `run()` ở lớp commands map lỗi sang exit code; lỗi không thuộc 3 lớp này → exit 1, không in stack trace.
- Message của lỗi **không** chứa tiền tố; CLI thêm `Error: ` khi in. Bảng dưới là chuỗi CLI in ra stderr.

Message đã chốt (output CLI):
| Tình huống | Message |
|---|---|
| Tạo thành công | `Created ticket #<id>` |
| Thiếu title | `Error: --title is required` |
| Thiếu `--status` ở `update` | `Error: --status is required` |
| Không tìm thấy | `Error: ticket #<id> not found` |
| Status sai | `Error: invalid status "<value>". Allowed: open, in-progress, closed` |
| JSON hỏng | `Error: cannot read <file> (invalid JSON)` |
| Priority sai | `Error: invalid priority "<value>". Allowed: low, medium, high` |
| ID sai | `Error: invalid id "<value>". Expected a positive integer` |
| JSON sai cấu trúc | `Error: cannot read <file> (expected a JSON array)` |
| Ghi file thất bại | `Error: cannot write <file> (<mã lỗi>)` |
| Cập nhật thành công | `Updated ticket #<id>: status = <status>` |
| `list` rỗng | `No tickets found` |

Lỗi do Commander phát hiện (lệnh/option lạ, thiếu giá trị option) giữ nguyên message gốc của Commander, exit 2.

Định dạng in (mỗi dòng kết thúc bằng `\n`):
- `list`: mỗi ticket một dòng `#<id> [<status>] [<priority>] <title>`, thêm ` (tags: a, b)` nếu có tag.
- `show`: 6 dòng `ID: `, `Title: `, `Description: `, `Status: `, `Priority: `, `Tags: ` (tag nối bằng `, `); description hoặc tags rỗng in `-`.
- `create` nhận thêm `--description` và `--status` (mặc định theo bảng dữ liệu).

## 2. Danh sách hành vi

### Model — unit
| ID | Hành vi |
|---|---|
| T1 | Thiếu title → `ValidationError`, message `--title is required` (#2) |
| T2 | Title chỉ có khoảng trắng → lỗi như T1 |
| T3 | Title được trim hai đầu |
| T4 | Không truyền status → `open` (#1) |
| T5 | Status ngoài `open \| in-progress \| closed` → `ValidationError`, message `invalid status "<value>". Allowed: open, in-progress, closed` (#5) |
| T5b | Status hợp lệ (`in-progress`) được giữ nguyên |
| T6 | Không truyền priority → `medium` |
| T7 | Priority ngoài `low \| medium \| high` → `ValidationError`, message `invalid priority "<value>". Allowed: low, medium, high` |
| T7b | Priority hợp lệ (`high`) được giữ nguyên |
| T8 | Không truyền description → `""` |
| T8b | Có description → giữ nguyên, không trim |
| T9 | Không truyền tags → `[]` |
| T10 | Chuẩn hoá tags: trim, lowercase, bỏ rỗng (`a,,b`), bỏ trùng (`LMS, lms`), giữ thứ tự đầu tiên |
| T11 | Tách chuỗi tags: `"a, B,a"` → `["a","b"]` |
| T12 | ID hợp lệ là số nguyên dương; `abc`, `0`, `-1`, `1.5`, `01` → `ValidationError`, message `invalid id "<value>". Expected a positive integer` |

### Service — unit (storage giả trong bộ nhớ)
| ID | Hành vi |
|---|---|
| T13 | `create` khi danh sách rỗng → `id = 1`, ticket đủ 6 field (#1) |
| T14 | `create` khi đã có ticket → `id = max + 1` |
| T15 | `create` với input không hợp lệ → ném `ValidationError`, không gọi đọc và không gọi ghi |
| T16 | `list` không filter → tất cả ticket, theo `id` tăng dần |
| T17 | Lọc theo status |
| T18 | Lọc theo priority |
| T19 | Lọc kết hợp status + priority (#3) |
| T20 | Lọc theo một tag |
| T21 | Lọc nhiều tag theo AND: ticket thiếu một tag bị loại |
| T22 | Filter tag được chuẩn hoá trước khi so |
| T23 | Không ticket nào khớp → `[]` |
| T24 | Filter status/priority không hợp lệ → `ValidationError` |
| T25 | `get` id tồn tại → trả đúng ticket |
| T26 | `get` id không tồn tại → `NotFoundError` (#4) |
| T27 | `updateStatus` thành công → trả ticket đã cập nhật |
| T28 | `updateStatus` sang đúng status hiện tại → thành công |
| T29 | `updateStatus` id không tồn tại → `NotFoundError` |
| T30 | `updateStatus` status không hợp lệ → `ValidationError`, không gọi ghi (#5) |
| T31 | `updateStatus` chỉ đổi ticket đích; ticket khác giữ nguyên |

### Storage — integration (file thật trong thư mục tạm)
| ID | Hành vi |
|---|---|
| T32 | File không tồn tại → đọc ra `[]` |
| T33 | File 0 byte → `[]` |
| T34 | File chỉ có khoảng trắng / xuống dòng → `[]` |
| T35 | File có BOM UTF-8 và JSON hợp lệ → đọc bình thường |
| T36 | Nội dung không phải JSON → `StorageError`, file giữ nguyên nội dung (#6) |
| T37 | JSON hợp lệ nhưng không phải mảng (`{}`) → `StorageError` `cannot read <file> (expected a JSON array)`, file giữ nguyên |
| T38 | Ghi rồi đọc lại → cùng dữ liệu (round-trip) |
| T39 | Sau khi ghi, thư mục không còn file tạm |
| T39a | Rename lỗi `EPERM` 2 lần rồi thành công → ghi thành công (rename giả) |
| T39b | Rename lỗi mãi → `StorageError` `cannot write <file> (EPERM)`; file gốc giữ nguyên; không còn file tạm (rename giả) |
| T40 | Ghi khi thư mục cha chưa tồn tại → tự tạo thư mục, ghi thành công |

### Command — integration

Chạy in-process qua `run(argv, { env, stdout, stderr })`. Riêng T41, T44, T54, T56, T63, T64 chạy subprocess (`process.execPath --import tsx src/cli.ts`) để kiểm exit code, stream và stack trace thật.

| ID | Hành vi |
|---|---|
| T41 | `create --title "Login lỗi 500" --priority high` (file chưa có) → exit 0; stdout `Created ticket #1`; file `toEqual` `[{ id: 1, title: "Login lỗi 500", description: "", status: "open", priority: "high", tags: [] }]` (#1) |
| T41b | `create --title x --description "  mô tả  " --status in-progress` → lưu đúng description (không trim) và status |
| T42 | `create --tags "LMS, login,lms"` → lưu `["lms","login"]` |
| T43 | `create --tags a,b --tags c` → lưu `["a","b","c"]` |
| T44 | `create --priority high` (thiếu title) → exit 2; stderr `Error: --title is required`; stdout rỗng; file không bị tạo (#2) |
| T45 | `create --title "   "` → exit 2; file không đổi |
| T46 | `create --title x --priority urgent` → exit 2; file không đổi |
| T47 | `create` khi file hỏng → exit 1; file giữ nguyên |
| T48 | `create` khi file 0 byte → exit 0; `id = 1` |
| T49 | `list` có dữ liệu → in danh sách, exit 0 |
| T50 | `list` khi file chưa tồn tại → exit 0, báo rỗng, không tạo file |
| T51 | `list --status open --priority high` → chỉ in ticket khớp (#3) |
| T52 | `list --tags lms,login` → AND; `--tags LMS` khớp tag `lms` |
| T53 | `list --status done` → exit 2 |
| T54 | `list` khi file hỏng → exit 1; stderr `Error: cannot read <file> (invalid JSON)`; file giữ nguyên (#6) |
| T55 | `show 1` → in đủ các field, exit 0 |
| T56 | `show 99` → exit 1; stderr `Error: ticket #99 not found`; không có stack trace (#4) |
| T57 | `show abc`, `show 0` → exit 2 |
| T58 | `update 1 --status closed` → exit 0; file được cập nhật |
| T59 | `update 1 --status open` khi ticket đang `open` → exit 0 |
| T60 | `update 1 --status done` → exit 2; stderr `Error: invalid status "done". Allowed: open, in-progress, closed`; file không đổi (#5) |
| T61 | `update 1` (thiếu `--status`) → exit 2; stderr `Error: --status is required` |
| T62 | `update 99 --status closed` → exit 1 |
| T63 | Lệnh không tồn tại hoặc option lạ → exit 2 |
| T64 | `create` rồi `list` ở hai lần chạy riêng → dữ liệu còn |

## 3. Còn mở
- Đo thời gian một lần spawn trên Windows (`Measure-Command`) trước khi viết test subprocess đầu tiên. Ngân sách cả suite: dưới 10 s.

---

# Phần B — Tuần 3: lệnh `kb` (Knowledge Base)

Cơ sở nghiên cứu: `docs/KB-RESEARCH.md`. Bản rút gọn ngày 2026-11-03.

**Thay đổi so với bản đầu:**
- Không dùng KB API thật. "HTTP" là một **KB server chạy trên máy** (`npm run kb-server`), tự viết theo API contract của đề. Mock và HTTP vẫn đổi qua biến môi trường như đề yêu cầu.
- Giảm từ 63 xuống 30 hành vi tự động (T65–T94), cộng 1 kịch bản chạy tay (T95).
- Cách làm: viết test cho cả nhóm theo spec trước, chạy thấy đỏ, rồi mới code cho xanh. Không bắt buộc commit theo từng vòng Red → Green.

## 4. Quyết định đã chốt

### 4.1 Kiến trúc và cách chạy

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

- `kb` là nhóm lệnh con của chương trình `tickets`: `tickets kb search|list|retrieve|add`. Khi dev: `npm run tickets -- kb search login`.
- **Validate ở `KBService`, không ở client.** Input sai được xử lý giống nhau với cả hai client và không có request rác gửi lên server. Client chỉ lo luật dữ liệu: không tìm thấy, trùng title.
- `KBService` nhận một hàm tạo client (`() => KBClient`) và chỉ gọi hàm đó sau khi input hợp lệ. Nhờ vậy lỗi input luôn ra exit 2, kể cả khi cấu hình sai (giống quyết định #9 tuần 2).
- **KB server dùng lại `MockKBClient` làm phần lõi.** Server chỉ làm việc của HTTP: đọc body, gọi client, chuyển kết quả và lỗi thành JSON + status code. Vì vậy hai client giống nhau cả về thuật toán search, và cùng một bộ contract test chạy được cho cả hai.
- Dữ liệu của server nằm trong bộ nhớ của tiến trình server: `kb add` qua HTTP rồi `kb retrieve` ở lần chạy CLI khác vẫn thấy, cho tới khi tắt server. Khởi động lại thì về dữ liệu seed.
- Với `KB_CLIENT=mock`, mỗi lần chạy CLI là một bản seed mới, nên `kb add` không được giữ lại giữa hai lần chạy.
- `run(argv, io, deps?)`: tham số thứ ba tuỳ chọn `deps.kbClient` để test truyền thẳng một client (bỏ qua biến môi trường). CLI thật không truyền tham số này.

### 4.2 Biến môi trường

| Biến | Giá trị | Mặc định | Lỗi |
|---|---|---|---|
| `KB_CLIENT` | `mock` \| `http` (phân biệt hoa thường) | `mock` | Giá trị khác → `ValidationError` |
| `KB_API_URL` | URL `http://` hoặc `https://` | `http://localhost:4000` | Sai dạng → `ValidationError`. Bỏ `/` cuối trước khi nối endpoint |
| `KB_PORT` | Cổng của KB server | `4000` | Chỉ dùng cho `npm run kb-server` |

### 4.3 Dữ liệu

```ts
interface Document { id: string; title: string; content: string; nodePath: string; tags: string[] }
type MatchType = 'title' | 'tag' | 'content';
interface SearchResult { document: Pick<Document, 'id' | 'title' | 'nodePath'>; matchType: MatchType }
interface KBQuery { query: string; topK: number; filters?: { tags?: string[] } }   // filters: khai báo cho khớp đề, tuần 3 chưa dùng
interface ListQuery { nodePath: string; limit: number; recursive: boolean }
interface NewDocument { title: string; content: string; nodePath: string; tags: string[] }
```

- `SearchResult.document` chỉ gồm `id`, `title`, `nodePath`, vì response `/search` trong API contract chỉ có ba trường này. Muốn xem nội dung thì dùng `retrieve`.
- `matchType` là trường có độ ưu tiên cao nhất mà tài liệu khớp (title > tag > content). Vì server dùng chung lõi với mock nên HTTP cũng luôn trả `matchType`.
- `id` không validate định dạng `doc-NNN`.

### 4.4 Chuẩn hoá

- **`normalize` (chỉ dùng để so sánh)**: trim → lowercase → bỏ dấu (`NFD`, xoá `U+0300–U+036F`) → `đ` thành `d`. Dữ liệu lưu và in ra giữ nguyên chữ gốc.
- **`nodePath`** (ở `list` và `add`): trim; rỗng hoặc không bắt đầu bằng `/` → lỗi; gộp `//` thành `/`; bỏ `/` cuối (trừ gốc `/`); giữ nguyên hoa thường.
- **Tags**: dùng lại `normalizeTags` của Phần A (tách phẩy, trim, lowercase, bỏ rỗng, bỏ trùng); `--tags` lặp lại thì gộp.
- **Số nguyên dương** (`parsePositiveInt(raw, name, max, default)`): regex `^[1-9]\d*$` và `<= max`. `--top-k`: 1–50, mặc định 5. `--limit`: 1–100, mặc định 10. Sai thì báo lỗi, không tự chặn về max.

### 4.5 Các lệnh

**`kb search <query> [--top-k n]`**
- Query trim; rỗng → lỗi.
- Khớp chuỗi con trên giá trị đã `normalize`, tìm trong title, từng tag, content. Điểm: title = 3, tag = 2, content = 1; mỗi tài liệu lấy điểm cao nhất. Sắp theo điểm giảm dần, cùng điểm thì `id` tăng dần, rồi cắt `topK`. `topK` lớn hơn số kết quả → trả tất cả.

**`kb list --node <path> [--limit n] [--recursive]`**
- `--node` bắt buộc. Mặc định chỉ lấy tài liệu có `nodePath` đúng bằng node; `--recursive` lấy thêm cây con (`nodePath === node` hoặc `startsWith(node + '/')`; node `/` khớp tất cả). Sắp theo `id` tăng dần rồi cắt `limit`. Không có tài liệu → danh sách rỗng, exit 0.

**`kb retrieve <id>`**
- Id trim; rỗng → lỗi input (exit 2). Không tìm thấy → `NotFoundError` (exit 1).

**`kb add --file <path> --path <node> [--title <title>] [--tags <tags>]`**
- `--file`, `--path` bắt buộc. Đọc file UTF-8, bỏ BOM. Không đọc được → `StorageError`. Nội dung sau trim rỗng → lỗi input. `content` là toàn bộ file (đã bỏ BOM, không trim).
- Title theo thứ tự: `--title` → dòng đầu tiên dạng `# ...` → tên file bỏ đuôi; luôn trim.
- Trùng title (so sau `normalize`) **trong cùng node** → `ConflictError`; khác node thì cho phép.
- Mock sinh id `max(số trong id) + 1`, đệm 3 chữ số (`doc-005`). Qua HTTP: server sinh id, client dùng id trong response.
- Client copy dữ liệu seed bằng `structuredClone`, nên `add` không làm thay đổi seed dùng chung.

### 4.6 HTTP: API contract của KB server

Mọi endpoint là `POST`, `Content-Type: application/json`.

| Endpoint | Body gửi lên | Response 2xx |
|---|---|---|
| `/search` | `{ "query": "login", "topK": 5 }` | `200 { "results": [{ "id", "title", "nodePath", "matchType" }] }` |
| `/list` | `{ "nodePath": "/templates/email", "limit": 10, "recursive": false }` | `200 { "documents": [Document] }` |
| `/retrieve` | `{ "docId": "doc-001" }` | `200 { "document": Document }` |
| `/add` | `{ "title", "content", "nodePath", "tags" }` | `201 { "document": Document }` |

- `recursive` trong `/list` là trường thêm vào so với đề.
- Lỗi luôn có body `{ "error": "<message>" }`: body không phải JSON hoặc sai kiểu trường → `400`; không tìm thấy tài liệu → `404`; trùng title → `409`; endpoint lạ hoặc không phải `POST` → `404`; lỗi khác → `500`.

**HTTPKBClient ánh xạ lỗi:**

| Tình huống | Lỗi |
|---|---|
| 400 | `ValidationError`, message lấy từ `error` trong body |
| 404 | `NotFoundError`, message lấy từ `error` |
| 409 | `ConflictError`, message lấy từ `error` |
| Status khác ngoài 2xx | `KBApiError` `KB API error (<status>)` |
| Lỗi mạng (từ chối kết nối, DNS) | `KBApiError` `cannot reach KB API at <url> (<mã lỗi>)` |
| 2xx nhưng body không phải JSON hoặc thiếu trường | `KBApiError` `unexpected response from KB API (<endpoint>)` |

Constructor: `new HTTPKBClient(baseUrl, fetchFn = fetch)` để test truyền `fetch` giả.

### 4.7 Lỗi, exit code và output

Thêm 2 lớp lỗi: `ConflictError` (exit 1), `KBApiError` (exit 1). Các quy tắc khác giữ như Phần A: chỉ `run()` map exit code, lỗi ra stderr có tiền tố `Error: `, stdout rỗng, không stack trace.

| Tình huống | Output |
|---|---|
| Query rỗng | `Error: query is required` |
| `--top-k` sai | `Error: invalid --top-k "<value>". Expected an integer from 1 to 50` |
| `--limit` sai | `Error: invalid --limit "<value>". Expected an integer from 1 to 100` |
| Thiếu `--node` | `Error: --node is required` |
| Node sai | `Error: invalid node path "<value>". Expected a path starting with "/"` |
| Id rỗng | `Error: document id is required` |
| Không tìm thấy | `Error: document <id> not found` |
| Thiếu `--file` / `--path` | `Error: --file is required` / `Error: --path is required` |
| Không đọc được file | `Error: cannot read <file> (<mã lỗi>)` |
| File rỗng | `Error: file <file> is empty` |
| Trùng title | `Error: document "<title>" already exists at <nodePath> (<id>)` |
| Title rỗng (sau khi lấy theo thứ tự ở 4.5) | `Error: title is required` |
| `KB_CLIENT` sai | `Error: invalid KB_CLIENT "<value>". Allowed: mock, http` |
| `KB_API_URL` sai | `Error: invalid KB_API_URL "<value>"` |
| Lỗi KB API | như bảng ánh xạ ở 4.6 |
| Không có kết quả (`search`, `list`) | `No documents found` (stdout, exit 0) |
| Thêm thành công | `Added document <id> at <nodePath>` |

Định dạng in (mỗi dòng kết thúc bằng `\n`):
- `search`: `<id> <nodePath> <title> (match: <matchType>)`.
- `list`: `<id> <nodePath> <title>`, thêm ` (tags: a, b)` nếu có tag.
- `retrieve`: 4 dòng `ID: `, `Title: `, `Node: `, `Tags: ` (tags rỗng in `-`), một dòng trống, rồi content nguyên văn; thêm `\n` nếu content không kết thúc bằng xuống dòng.

### 4.8 Dữ liệu

**Seed mặc định** (`src/kb/seed.ts`, 13 tài liệu): dùng khi chạy CLI với mock và khi chạy KB server. Nội dung lấy từ các scenario tuần 4, không có tên hay email người thật.

| Node | Tài liệu |
|---|---|
| `/templates/email` | ACK login, resolution reset mật khẩu, ACK sự cố Priority, follow-up xác nhận đã xử lý |
| `/templates/sms` | Thông báo bảo trì hệ thống |
| `/templates/teams` | Escalation cho dev team |
| `/team/devops` | Thành viên và kênh liên hệ, lịch on-call |
| `/team/support` | Ca trực và bàn giao |
| `/docs/guides` | Phân loại Class of Service, quy trình 7 bước |
| `/runbooks/login`, `/runbooks/performance` | Runbook lỗi đăng nhập LMS, runbook Denise tải chậm |

**Fixture cho test** (`tests/fixtures/kb-documents.ts`, 4 tài liệu cố định, tách khỏi seed để sửa seed không làm hỏng test):

| id | title | nodePath | tags |
|---|---|---|---|
| `doc-001` | `Runbook: Xử lý lỗi đăng nhập LMS` | `/runbooks/login` | `login`, `lms`, `teacher` |
| `doc-002` | `Email ACK – Login issue` | `/templates/email` | `login`, `ack` |
| `doc-003` | `Email resolution – Đã reset mật khẩu` | `/templates/email` | `login`, `resolution` |
| `doc-004` | `DevOps on-call` | `/team/devops` | `team`, `devops`, `on-call` |

Content: `doc-001` là runbook theo `KB-RESEARCH.md` §4 (có câu `Kiểm tra trạng thái tài khoản trên Base.`); `doc-002`, `doc-003` là template email ngắn (`doc-003` có cụm `đăng nhập lại`); `doc-004` liệt kê vai trò trực và kênh `#devops-oncall`.

## 5. Danh sách hành vi

### Chuẩn hoá và cấu hình — unit
| ID | Hành vi |
|---|---|
| T65 | `normalize("  Đăng NHẬP ")` → `"dang nhap"` |
| T66 | `normalizeNodePath`: `/templates/email/`, `/templates//email`, `" /templates/email "` → `/templates/email`; `/` giữ nguyên; `/Templates` giữ hoa thường |
| T67 | `normalizeNodePath("")`, `"templates/email"` → `ValidationError` với message node sai |
| T68 | `parsePositiveInt`: không truyền → mặc định; `"3"` → 3; `"50"` hợp lệ cho `--top-k`. `0`, `-1`, `2.5`, `abc`, `1e2`, `51` → lỗi `--top-k`; `101` → lỗi `--limit` |
| T69 | `resolveTitle`: `--title` thắng heading; không `--title` thì lấy dòng `# ...` đầu tiên; không heading thì lấy tên file bỏ đuôi |
| T70 | `parseKBConfig`: không đặt gì → `mock`, `http://localhost:4000`; `KB_CLIENT=HTTP` → lỗi; `KB_API_URL=abc`, `ftp://x` → lỗi; `http://kb.test/` → `http://kb.test` |

### KBService — unit (client giả ghi lại lời gọi)
| ID | Hành vi |
|---|---|
| T71 | `search`: query rỗng/khoảng trắng → `ValidationError`, không tạo client; hợp lệ → client nhận query đã trim và `topK` mặc định 5 |
| T72 | `list`: thiếu node → lỗi, không tạo client; hợp lệ → node đã chuẩn hoá, `limit` 10, `recursive` false |
| T73 | `retrieve`: id rỗng → lỗi, không tạo client; hợp lệ → id đã trim |
| T74 | `add`: thiếu `--file`/`--path` → lỗi; file không tồn tại → `StorageError` `cannot read <file> (ENOENT)`; file rỗng → `ValidationError`; hợp lệ → client nhận title, content đã bỏ BOM, node và tags đã chuẩn hoá |

### KBClient contract — chạy cho cả `MockKBClient` và `HTTPKBClient` + KB server local
Một hàm `kbClientContract(name, makeClient)`. Mỗi test dùng client mới với fixture 4 tài liệu; với HTTP thì bật server mới ở cổng ngẫu nhiên (`port 0`) và tắt sau test.

| ID | Hành vi |
|---|---|
| T75 | `search("login", 5)` → `[doc-002 (title), doc-001 (tag), doc-003 (tag)]` đúng thứ tự |
| T76 | `search("dang nhap", 5)` → `[doc-001 (title), doc-003 (content)]`; `search("LOGIN ISSUE")` → `[doc-002]`; `topK = 1` → 1 kết quả; không khớp → `[]` |
| T77 | `list`: `/templates/email` → `[doc-002, doc-003]`; `/templates` không đệ quy → `[]`, có đệ quy → `[doc-002, doc-003]`; `/` đệ quy, `limit 2` → `[doc-001, doc-002]`; node không có → `[]` |
| T78 | Tài liệu ở `/templates-old/email` không lọt vào `list("/templates", recursive)` |
| T79 | `retrieve("doc-004")` → `Document` đủ 5 trường (tra thông tin team); `retrieve("doc-999")` → `NotFoundError` `document doc-999 not found` |
| T80 | `add` → id `doc-005`; `retrieve` lại ra đúng title, content, nodePath, tags; fixture gốc không bị đổi |
| T81 | `add` title `"email ack – login issue "` ở `/templates/email` → `ConflictError` `document "email ack – login issue" already exists at /templates/email (doc-002)`; cùng title ở node khác → thành công |

### HTTPKBClient — unit (`fetch` giả), phần contract không bao được
| ID | Hành vi |
|---|---|
| T82 | Gửi đúng `POST <baseUrl><endpoint>`, header JSON và body cho cả 4 thao tác (`/list` có `recursive`, `/retrieve` dùng `docId`) |
| T83 | 400 `{"error":"x"}` → `ValidationError("x")`; 500 → `KBApiError` `KB API error (500)` |
| T84 | `fetch` ném lỗi có `cause.code = "ECONNREFUSED"` → `KBApiError` `cannot reach KB API at <url> (ECONNREFUSED)`; 200 nhưng body không phải JSON hoặc thiếu `results` → `KBApiError` `unexpected response from KB API (/search)` |

### KB server — integration
| ID | Hành vi |
|---|---|
| T85 | Body không phải JSON hoặc sai kiểu (`topK: "5"`) → 400 có `error`; `GET /search` hoặc `POST /abc` → 404 có `error` |

### Command — integration (in-process qua `run`, `deps.kbClient = new MockKBClient(fixture)` trừ khi ghi khác)
| ID | Hành vi |
|---|---|
| T86 | `kb search login --top-k 2` → exit 0, 2 dòng, dòng đầu `doc-002 /templates/email Email ACK – Login issue (match: title)`; `kb search xyz` → `No documents found` |
| T87 | `kb search ""` → exit 2 `Error: query is required`; `kb search login --top-k 0` → exit 2 đúng message; stdout rỗng |
| T88 | `kb list --node /templates/email/` → 2 dòng doc-002, doc-003 có ` (tags: ...)`; thiếu `--node` → exit 2; `--node templates` → exit 2 |
| T89 | `kb retrieve doc-004` → 4 dòng đầu, dòng trống, rồi content; `kb retrieve doc-999` → exit 1 `Error: document doc-999 not found` |
| T90 | `kb add --file <tmp>/sms.md --path /templates/sms --tags SMS,sms` → `Added document doc-005 at /templates/sms`; file không tồn tại → exit 1; file rỗng → exit 2; trùng title → exit 1 |
| T91 | (không inject) `KB_CLIENT=abc kb search login` → exit 2 `Error: invalid KB_CLIENT "abc". Allowed: mock, http`; `KB_CLIENT=abc kb search ""` → exit 2 với message của query |
| T92 | (không inject) `KB_CLIENT=http` + `KB_API_URL` của server local (fixture) → `kb search login --top-k 2` ra **đúng output như T86**; `KB_API_URL` trỏ tới một cổng trống (mở cổng ngẫu nhiên rồi đóng lại) → exit 1, `Error: cannot reach KB API at <url> (ECONNREFUSED)`. Không dùng cổng 9: `fetch` của Node chặn các cổng "unsafe" theo chuẩn Fetch trước khi kết nối, nên không có mã `ECONNREFUSED` |
| T93 | Chạy lệnh `kb` không tạo `tickets.json` |
| T94 | (không inject, seed mặc định) `kb search on-call` có tài liệu ở `/team/devops`; `kb list --node /templates --recursive` có ít nhất 3 template email |

### Chạy tay (lưu vào `evidence/week-3/`)
| ID | Hành vi |
|---|---|
| T95 | Bật `npm run kb-server`, ở terminal khác chạy cả 4 lệnh với `KB_CLIENT=http` (tra template, tra thông tin team, thêm template SMS rồi retrieve lại); lưu lệnh và output |

## 6. Ngoài phạm vi tuần 3
- Gọi KB API thật của công ty; xác thực (API key).
- Semantic search, embedding; lọc theo tag (`KBQuery.filters` chỉ khai báo).
- Sửa, xoá tài liệu; phân trang; server lưu dữ liệu ra file.
- Timeout, retry, cache khi gọi HTTP.
