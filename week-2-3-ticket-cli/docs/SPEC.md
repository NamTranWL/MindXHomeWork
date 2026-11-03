# Ticket Manager CLI — Đặc tả hành vi (tuần 2–3)

Tài liệu này là danh sách hành vi cần test trước khi implement. Mỗi hành vi `Tn` tương ứng một vòng Red → Green → Refactor.
Ký hiệu `(#n)` = test case có từ §4.1 `TDD-Research.md` (tuần 1).

- **Phần A (mục 1–3):** lệnh `tickets` — tuần 2, đã chốt.
- **Phần B (mục 4–7):** lệnh `kb` gọi Knowledge Base — tuần 3. Cơ sở nghiên cứu: `docs/KB-RESEARCH.md`.

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

## 4. Quyết định đã chốt

Ký hiệu **(tạm)** = quyết định dựa trên nghiên cứu, chưa kiểm chứng với KB API thật. Trước Ngày 3, gọi thử bằng curl (mục 7); nếu server khác thì sửa spec theo server, viết test đỏ thể hiện khác biệt, ghi lý do vào `DECISIONS.md`.

### 4.1 Kiến trúc và cách chạy

```
run()  →  kb commands  →  KBService (validate + chuẩn hoá)  →  KBClient (port)
                                                               ├── MockKBClient (bộ nhớ, seed 3 tài liệu)
                                                               └── HTTPKBClient (fetch → KB API)
```

- `kb` là nhóm lệnh con trong cùng chương trình `tickets`: `tickets kb search|list|retrieve|add`. Dùng lại `run()`, `exitOverride()` và cách map lỗi của Phần A. Khi dev: `npm run tickets -- kb search "login"`.
- `run()` chỉ tạo `TicketService` khi chạy lệnh ticket và chỉ tạo `KBService` khi chạy lệnh `kb` (khởi tạo lười). Lệnh `kb` không đọc hay tạo `tickets.json`.
- **Validate ở `KBService`, không ở client.** Mock và HTTP nhận input đã sạch, nên input sai được xử lý giống nhau với cả hai client và không có request rác gửi lên server. Client chỉ lo luật dữ liệu: không tìm thấy, trùng title.
- Thứ tự: validate input → đọc cấu hình môi trường → tạo client → gọi. Lỗi input luôn ra exit 2, bất kể cấu hình (giống quyết định #9 tuần 2).

### 4.2 Biến môi trường

| Biến | Giá trị | Mặc định | Lỗi |
|---|---|---|---|
| `KB_CLIENT` | `mock` \| `http` (phân biệt hoa thường) | `mock` | Giá trị khác → `ValidationError` |
| `KB_API_URL` | URL `http://` hoặc `https://` | — | Bắt buộc khi `KB_CLIENT=http`; thiếu hoặc sai → `ValidationError`. Bỏ `/` cuối trước khi nối endpoint |

Timeout mỗi request: 10 000 ms, cố định trong code (truyền được qua constructor để test).

### 4.3 Dữ liệu

```ts
interface Document { id: string; title: string; content: string; nodePath: string; tags: string[] }
type MatchType = 'title' | 'tag' | 'content';
interface SearchResult {
  document: Pick<Document, 'id' | 'title' | 'nodePath'>;
  matchType?: MatchType;   // Mock luôn có; HTTP chỉ có nếu server trả về
}
interface KBQuery { query: string; topK: number }
interface ListQuery { nodePath: string; limit: number; recursive: boolean }
interface NewDocument { title: string; content: string; nodePath: string; tags: string[] }
```

- `SearchResult.document` chỉ gồm `id`, `title`, `nodePath` vì response `/search` trong API contract chỉ có ba trường này. Muốn xem nội dung thì dùng `retrieve`. **(tạm)**
- `matchType` là trường ưu tiên cao nhất mà tài liệu khớp. **(tạm)** — đề không liệt kê giá trị.
- `id` là chuỗi do client sinh (Mock) hoặc server sinh (HTTP). Không validate định dạng `doc-NNN`, vì server có thể dùng định dạng khác.

### 4.4 Chuẩn hoá

**Văn bản để so khớp (`normalize`)** — dùng cho search và so trùng title:
trim → lowercase → bỏ dấu (`NFD`, xoá ký tự `U+0300–U+036F`) → `đ` thành `d`. Chỉ dùng để so; dữ liệu lưu và in ra giữ nguyên chữ gốc.

**`nodePath`** — áp dụng ở `list` và `add`:
1. Trim hai đầu; rỗng → lỗi.
2. Không bắt đầu bằng `/` → lỗi.
3. Gộp nhiều `/` liên tiếp thành một: `/templates//email` → `/templates/email`.
4. Bỏ `/` cuối, trừ gốc `/`: `/templates/email/` → `/templates/email`.
5. **Giữ nguyên hoa thường**: `/Templates` khác `/templates` (như đường dẫn Linux và URL).

**Tags** — dùng lại hàm chuẩn hoá của Phần A: tách dấu phẩy → trim → lowercase → bỏ rỗng → bỏ trùng, giữ thứ tự đầu tiên. `--tags` truyền lặp lại thì gộp.

### 4.5 `kb search <query>`

- `query` trim; rỗng hoặc chỉ khoảng trắng → lỗi.
- `--top-k`: số nguyên từ 1 đến 50, mặc định 5. Ngoài khoảng hoặc không phải số nguyên (`0`, `-1`, `2.5`, `abc`, `1e2`) → lỗi, **không tự chặn về 50**. Dùng chung hàm `parsePositiveInt(raw, name, max)` với `--limit`, cùng regex `^[1-9]\d*$` như ID ở Phần A.
- `topK` lớn hơn số tài liệu khớp → trả tất cả tài liệu khớp, không lỗi.
- **Mock** (keyword, khớp chuỗi con trên giá trị đã `normalize`):
  - Tìm trong title, từng tag và content.
  - Điểm: title = 3, tag = 2, content = 1; mỗi tài liệu lấy điểm của trường cao nhất nó khớp.
  - Sắp xếp: điểm giảm dần, cùng điểm thì `id` tăng dần. Cắt `topK` kết quả đầu.
- **HTTP**: gửi `{ query, topK }` lên `/search`, giữ nguyên thứ tự server trả. Mock và HTTP chỉ phải giống nhau về hợp đồng (dạng input/output, lỗi), không phải giống thuật toán.

### 4.6 `kb list --node <path>`

- `--node` bắt buộc. Muốn xem cả KB: `kb list --node / --recursive`.
- `--limit`: số nguyên từ 1 đến 100, mặc định 10. Luật như `--top-k`.
- **Mặc định không đệ quy**: chỉ tài liệu có `nodePath` bằng đúng node. `--recursive` lấy thêm cây con.
- Khớp cây con: `doc.nodePath === node || doc.nodePath.startsWith(node + '/')`; node `/` khớp mọi tài liệu. Không dùng `startsWith(node)` trần, vì `/templates-old` sẽ bị coi là con của `/templates`.
- Kết quả sắp theo `id` tăng dần, rồi cắt `limit`.
- Node không có tài liệu nào → danh sách rỗng, exit 0 (node chỉ tồn tại khi có tài liệu).

### 4.7 `kb retrieve <id>`

- `id` trim; rỗng → lỗi input (exit 2), khác với không tìm thấy (exit 1).
- Không tìm thấy → `NotFoundError`. HTTP: status 404 chuyển thành đúng lỗi này.

### 4.8 `kb add --file <path> --path <node> [--title <title>] [--tags <tags>]`

- `--file` và `--path` bắt buộc.
- Đọc file UTF-8, bỏ BOM. File không tồn tại hoặc không đọc được → `StorageError`. Nội dung sau trim rỗng → lỗi input.
- `content` là toàn bộ nội dung file (đã bỏ BOM, không trim).
- `title`: lấy theo thứ tự `--title` → dòng đầu tiên dạng `# Tiêu đề` trong file → tên file bỏ phần mở rộng. Luôn trim; rỗng → lỗi.
- **Trùng title**: cấm trùng trong **cùng `nodePath`** (so sau `normalize`); khác node thì cho phép. Trùng → `ConflictError`. HTTP: status 409 chuyển thành lỗi này. **(tạm)**
- **Sinh id**:
  - Mock: `max(số trong id) + 1`, đệm 3 chữ số (`doc-004`; quá 999 thì `doc-1000`). Không dùng `docs.length + 1`.
  - HTTP: server sinh id; client dùng id trong response, không tự sinh.
- **Mock chỉ lưu trong bộ nhớ của một lần chạy**: `kb add` rồi `kb retrieve` ở hai lần chạy CLI riêng sẽ không thấy tài liệu mới. Lưu lâu dài chỉ có ở HTTP. Constructor copy seed bằng `structuredClone` để các test không làm bẩn nhau.

### 4.9 HTTPKBClient

- Mọi endpoint là `POST`, header `Content-Type: application/json`, body như API contract:
  `/search {query, topK}` · `/list {nodePath, limit, recursive}` · `/retrieve {docId}` · `/add {title, content, nodePath, tags}`.
  Trường `recursive` trong `/list` là của mình, chưa có trong contract. **(tạm)**
- Constructor nhận `baseUrl` và tuỳ chọn `{ fetch, timeoutMs }` để test truyền `fetch` giả, không sửa `global.fetch`.
- Ánh xạ lỗi:

| Tình huống | Lỗi |
|---|---|
| 400, 422 | `ValidationError`, message lấy từ trường `error` hoặc `message` trong body nếu có |
| 404 | `NotFoundError` |
| 409 | `ConflictError` |
| Status khác ngoài 2xx | `KBApiError` |
| Lỗi mạng (DNS, từ chối kết nối) | `KBApiError` |
| Quá timeout | `KBApiError` |
| 2xx nhưng body không phải JSON hoặc thiếu trường bắt buộc | `KBApiError` |

- Phân tích response gom vào một hàm cho mỗi endpoint, để khi curl cho thấy dạng khác chỉ phải sửa một chỗ.

### 4.10 Lỗi, exit code và output

Lớp lỗi: dùng lại `ValidationError` (exit 2), `NotFoundError` (1), `StorageError` (1) của Phần A; thêm `ConflictError` (1) và `KBApiError` (1). Vẫn chỉ `run()` map lỗi sang exit code; quy tắc stdout/stderr và tiền tố `Error: ` giữ như Phần A.

Message đã chốt (output CLI):
| Tình huống | Message |
|---|---|
| Query rỗng | `Error: query is required` |
| `--top-k` sai | `Error: invalid --top-k "<value>". Expected an integer from 1 to 50` |
| `--limit` sai | `Error: invalid --limit "<value>". Expected an integer from 1 to 100` |
| Thiếu `--node` | `Error: --node is required` |
| Node sai | `Error: invalid node path "<value>". Expected a path starting with "/"` |
| Id rỗng | `Error: document id is required` |
| Không tìm thấy tài liệu | `Error: document <id> not found` |
| Thiếu `--file` | `Error: --file is required` |
| Thiếu `--path` | `Error: --path is required` |
| Không đọc được file | `Error: cannot read <file> (<mã lỗi>)` |
| File rỗng | `Error: file <file> is empty` |
| Trùng title | `Error: document "<title>" already exists at <nodePath> (<id>)` |
| `KB_CLIENT` sai | `Error: invalid KB_CLIENT "<value>". Allowed: mock, http` |
| Thiếu `KB_API_URL` | `Error: KB_API_URL is required when KB_CLIENT=http` |
| `KB_API_URL` sai | `Error: invalid KB_API_URL "<value>"` |
| Server lỗi | `Error: KB API error (<status>)` |
| Không kết nối được | `Error: cannot reach KB API at <url> (<mã lỗi>)` |
| Quá thời gian | `Error: KB API timed out after <ms> ms` |
| Response sai dạng | `Error: unexpected response from KB API (<endpoint>)` |
| Không có kết quả (`search`, `list`) | `No documents found` (stdout, exit 0) |
| Thêm thành công | `Added document <id> at <nodePath>` |

Định dạng in (mỗi dòng kết thúc bằng `\n`):
- `search`: mỗi kết quả một dòng `<id> <nodePath> <title>`, thêm ` (match: <matchType>)` nếu có.
- `list`: mỗi tài liệu một dòng `<id> <nodePath> <title>`, thêm ` (tags: a, b)` nếu có tag.
- `retrieve`: 4 dòng `ID: `, `Title: `, `Node: `, `Tags: ` (tags rỗng in `-`), một dòng trống, rồi content nguyên văn; thêm `\n` nếu content không kết thúc bằng xuống dòng.

### 4.11 Dữ liệu seed của MockKBClient

| id | title | nodePath | tags |
|---|---|---|---|
| `doc-001` | `Runbook: Xử lý lỗi đăng nhập LMS` | `/runbooks/login` | `login`, `lms`, `teacher` |
| `doc-002` | `Email ACK – Login issue` | `/templates/email` | `login`, `ack` |
| `doc-003` | `Email resolution – Đã reset mật khẩu` | `/templates/email` | `login`, `resolution` |

Content (cố định, để kết quả search đoán trước được):
- `doc-001`: runbook theo `KB-RESEARCH.md` §4, có câu `Kiểm tra trạng thái tài khoản trên Base.`
- `doc-002`: `Chào {name},\nChúng tôi đã nhận yêu cầu {ticketId} và đang kiểm tra. Chúng tôi sẽ cập nhật cho bạn sớm nhất có thể.\n`
- `doc-003`: `Chào {name},\nMật khẩu của bạn đã được đặt lại. Vui lòng đăng nhập lại tại lms.mindx.edu.vn và đổi mật khẩu sau lần đầu.\n`

Chỉ là nội dung mẫu: không có tên hay email người thật.

## 5. Danh sách hành vi

### Chuẩn hoá và validate — unit
| ID | Hành vi |
|---|---|
| T65 | `normalize`: `"  Đăng NHẬP "` → `"dang nhap"` |
| T66 | `normalizeNodePath`: `/templates/email/`, `/templates//email`, `" /templates/email "` → `/templates/email`; `/` giữ nguyên |
| T67 | `normalizeNodePath`: `""`, `templates/email` → `ValidationError` `invalid node path "<value>". Expected a path starting with "/"` |
| T68 | `normalizeNodePath` giữ hoa thường: `/Templates` không đổi |
| T69 | `parsePositiveInt`: không truyền → mặc định; `"3"` → `3` |
| T70 | `parsePositiveInt` cho `--top-k`: `0`, `-1`, `2.5`, `abc`, `1e2`, `51` → `ValidationError` `invalid --top-k "<value>". Expected an integer from 1 to 50`; `50` hợp lệ |
| T71 | `parsePositiveInt` cho `--limit`: `101` → lỗi; `100` hợp lệ |
| T72 | Lấy title cho `add`: `--title` thắng heading; không `--title` thì lấy dòng `# ...` đầu tiên (trim); không heading thì lấy tên file bỏ đuôi |
| T73 | `parseKBConfig`: không đặt `KB_CLIENT` → `mock`; `KB_CLIENT=HTTP` → `ValidationError` |
| T74 | `parseKBConfig`: `KB_CLIENT=http` thiếu `KB_API_URL` → lỗi; `KB_API_URL=ftp://x`, `abc` → lỗi; `http://kb.test/` → base URL `http://kb.test` |

### KBService — unit (client giả ghi lại lời gọi)
| ID | Hành vi |
|---|---|
| T75 | `search` query rỗng hoặc chỉ khoảng trắng → `ValidationError` `query is required`; **không gọi client** |
| T76 | `search` truyền xuống client query đã trim và `topK` mặc định 5 |
| T77 | `list` thiếu node → `ValidationError` `--node is required`; không gọi client |
| T78 | `list` truyền xuống node đã chuẩn hoá, `limit` mặc định 10, `recursive` mặc định `false` |
| T79 | `retrieve` id rỗng → `ValidationError` `document id is required`; không gọi client |
| T80 | `add` truyền xuống title đã trim, node đã chuẩn hoá, tags đã chuẩn hoá (`"SMS, sms ,login"` → `["sms","login"]`) |
| T81 | `add` title rỗng sau khi lấy theo T72 → `ValidationError`; không gọi client |

### KBClient contract — chạy cho cả Mock và HTTP
Viết một hàm `kbClientContract(name, makeClient)` và gọi cho từng client. Mock luôn chạy. HTTP với server thật chỉ chạy khi có `KB_API_URL` (dùng `describe.skip` nếu không có); riêng T88–T90 (ghi dữ liệu) chỉ chạy khi thêm `KB_TEST_ALLOW_WRITE=1`, để không tạo dữ liệu rác trên KB thật. Với HTTP, chỉ assert phần hợp đồng (dạng kết quả, lớp lỗi), không assert thứ tự hay `matchType`.

| ID | Hành vi |
|---|---|
| T82 | `search("login", 5)` → kết quả có `document.id`, `title`, `nodePath` dạng chuỗi; tối đa 5 phần tử |
| T83 | `search("zzqx-khong-co", 5)` → `[]`, không lỗi |
| T84 | `search("login", 1)` → đúng 1 phần tử |
| T85 | `list({ nodePath: "/khong-co-node", limit: 10, recursive: false })` → `[]` |
| T86 | `retrieve` một id lấy từ kết quả `list` → `Document` đủ 5 trường |
| T87 | `retrieve("doc-999999")` → `NotFoundError` |
| T88 | `add` rồi `retrieve` id vừa nhận → cùng title, content, nodePath, tags |
| T89 | `add` hai lần cùng title, cùng node → lần hai `ConflictError` |
| T90 | `add` cùng title nhưng khác node → thành công |

### MockKBClient — unit (seed mục 4.11, client mới cho mỗi test)
| ID | Hành vi |
|---|---|
| T91 | `search("login")` → `[doc-002 (title), doc-001 (tag), doc-003 (tag)]`, đúng thứ tự (tie-break theo id) |
| T92 | `search("dang nhap")` → `[doc-001 (title), doc-003 (content)]` |
| T93 | `search("Base")` → `[doc-001 (content)]` |
| T94 | `search("LOGIN ISSUE")` → `[doc-002 (title)]` (không phân biệt hoa thường) |
| T95 | `search("login", topK = 100)` → 3 kết quả, không lỗi |
| T96 | `list("/templates/email")` → `[doc-002, doc-003]` |
| T97 | `list("/templates")` không đệ quy → `[]`; có `recursive` → `[doc-002, doc-003]` |
| T98 | `list("/", recursive)` → cả 3 tài liệu theo id tăng dần; `limit = 2` → `[doc-001, doc-002]` |
| T99 | Seed thêm tài liệu ở `/templates-old/email` → `list("/templates", recursive)` không chứa nó |
| T100 | `add` đầu tiên → `id = "doc-004"`; seed `doc-001, doc-003, doc-004` → `add` sinh `doc-005` |
| T101 | `add` title `"email ack – login issue "` ở `/templates/email` → `ConflictError` `document "email ack – login issue" already exists at /templates/email (doc-002)` |
| T102 | `add` trên một client không làm thay đổi seed của client tạo sau |

### HTTPKBClient — unit (`fetch` giả)
| ID | Hành vi |
|---|---|
| T103 | `search` gửi `POST <baseUrl>/search`, header JSON, body `{"query":"login","topK":3}` |
| T104 | `list` gửi `POST /list` body `{nodePath, limit, recursive}`; `retrieve` gửi `{"docId":"doc-001"}`; `add` gửi `{title, content, nodePath, tags}` |
| T105 | Response `/search` `{results:[{id,title,nodePath}]}` → `SearchResult[]` không có `matchType`; có `matchType` thì giữ |
| T106 | `add` dùng id trong response, không tự sinh |
| T107 | 404 → `NotFoundError`; 409 → `ConflictError` |
| T108 | 400 có body `{"error":"topK too large"}` → `ValidationError` với message `topK too large` |
| T109 | 500 → `KBApiError` `KB API error (500)` |
| T110 | `fetch` ném lỗi mạng có `cause.code = "ECONNREFUSED"` → `KBApiError` `cannot reach KB API at <url> (ECONNREFUSED)` |
| T111 | Quá `timeoutMs` (fetch giả không bao giờ trả) → `KBApiError` `KB API timed out after <ms> ms` |
| T112 | 200 nhưng body không phải JSON, hoặc `/search` thiếu `results` → `KBApiError` `unexpected response from KB API (/search)` |

### Command — integration (in-process qua `run`, `KB_CLIENT=mock`)
Riêng T122 và T123 chạy subprocess như Phần A.

| ID | Hành vi |
|---|---|
| T113 | `kb search login --top-k 2` → exit 0; stdout 2 dòng, dòng đầu `doc-002 /templates/email Email ACK – Login issue (match: title)` |
| T114 | `kb search xyz` → exit 0; stdout `No documents found` |
| T115 | `kb search ""` và `kb search login --top-k 0` → exit 2; stderr đúng message; stdout rỗng |
| T116 | `kb list --node /templates/email/` → exit 0; 2 dòng doc-002, doc-003 có ` (tags: ...)` |
| T117 | `kb list` (thiếu `--node`) → exit 2; `kb list --node templates` → exit 2 |
| T118 | `kb retrieve doc-001` → exit 0; đúng 4 dòng đầu, dòng trống, rồi content |
| T119 | `kb retrieve doc-999` → exit 1; stderr `Error: document doc-999 not found` |
| T120 | `kb add --file <tmp>/sms.md --path /templates/sms --tags SMS,sms` → exit 0; stdout `Added document doc-004 at /templates/sms` |
| T121 | `kb add --file <không tồn tại> --path /x` → exit 1 `cannot read ... (ENOENT)`; file rỗng → exit 2 `file ... is empty`; trùng title → exit 1 |
| T122 | `KB_CLIENT=http` không có `KB_API_URL` → exit 2; stderr `Error: KB_API_URL is required when KB_CLIENT=http`; không stack trace |
| T123 | `KB_CLIENT=http KB_API_URL=http://127.0.0.1:9` (cổng không ai nghe) → exit 1; stderr bắt đầu bằng `Error: cannot reach KB API`; không stack trace |
| T124 | Chạy lệnh `kb` không tạo `tickets.json`; lệnh `tickets` cũ vẫn đúng (T41–T64 vẫn xanh) |
| T125 | `kb search ""` với `KB_CLIENT=abc` → exit 2 với message của query (validate input trước cấu hình) |

### End-to-end với KB API thật (thủ công, ghi vào `evidence/`)
| ID | Hành vi |
|---|---|
| T126 | 4 lệnh chạy với `KB_CLIENT=http` trên KB API thật; lưu lệnh, output và kết quả curl tương ứng |
| T127 | Scenario 1 (Login Issue): `kb search login` → `kb retrieve` runbook → `kb retrieve` mẫu email ACK, ghi thời gian thực hiện |

## 6. Ngoài phạm vi tuần 3
- Semantic search, embedding, ngưỡng điểm trong Mock.
- Lọc theo tag ở `kb list` / `kb search` (`KBQuery.filters`).
- Sửa, xoá tài liệu; phân trang quá `limit`.
- Retry khi gọi HTTP lỗi; cache kết quả.
- Mock lưu ra file giữa các lần chạy.

## 7. Còn mở — kiểm chứng với KB API thật trước Ngày 3
Các mục **(tạm)** phía trên phụ thuộc những câu trả lời này:
- [ ] `/search` có trả `matchType` không? Giá trị gồm những gì? Có `content`, `tags` không?
- [ ] Dạng response của `/list`, `/retrieve`, `/add` (bọc trong `documents` / `document` hay trả thẳng)?
- [ ] `/list` có hỗ trợ đệ quy không, tên trường là gì? Có chuẩn hoá `/` cuối không?
- [ ] Status code và body lỗi khi: query rỗng, `topK` sai, id không tồn tại, trùng title.
- [ ] Server giới hạn `topK` / `limit` tối đa bao nhiêu? Nếu khác 50 / 100 thì theo server.
- [ ] KB đã có node và dữ liệu nào? Có KB riêng cho test ghi không? (hỏi mentor)

Lệnh kiểm tra mẫu:
```bash
curl -s -X POST "$KB_API_URL/search"   -H "Content-Type: application/json" -d '{"query":"login","topK":3}'
curl -s -X POST "$KB_API_URL/list"     -H "Content-Type: application/json" -d '{"nodePath":"/templates/email","limit":10}'
curl -s -X POST "$KB_API_URL/retrieve" -H "Content-Type: application/json" -d '{"docId":"doc-999999"}' -w "\n%{http_code}\n"
```