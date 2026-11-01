# Ticket Manager CLI — Đặc tả hành vi (tuần 2)

Tài liệu này là danh sách hành vi cần test trước khi implement. Mỗi hành vi `Tn` tương ứng một vòng Red → Green → Refactor.
Ký hiệu `(#n)` = test case có từ §4.1 `TDD-Research.md` (tuần 1).

## 1. Quyết định đã chốt

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
- Giá trị status/priority không hợp lệ trong filter là lỗi input (exit 2).
- Kết quả sắp theo `id` tăng dần.

### Cập nhật (`update`)
- Chỉ đổi `status`; `--status` bắt buộc.
- Chuyển tự do giữa ba trạng thái; đổi sang đúng status hiện tại vẫn thành công.

### File lưu trữ
- Đường dẫn lấy từ biến môi trường `TICKETS_FILE`.
- Đọc:
  - File không tồn tại → danh sách rỗng.
  - File 0 byte hoặc chỉ có khoảng trắng → danh sách rỗng.
  - BOM UTF-8 được bỏ trước khi parse.
  - Nội dung không phải JSON → lỗi, **không ghi đè**.
  - JSON hợp lệ nhưng cấp ngoài cùng không phải mảng → coi như hỏng, **không ghi đè**. Không kiểm từng field của phần tử.
- Ghi: ghi file tạm cùng thư mục rồi rename; không để lại file tạm.
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

Message đã chốt:
| Tình huống | Message |
|---|---|
| Tạo thành công | `Created ticket #<id>` |
| Thiếu title | `Error: --title is required` |
| Không tìm thấy | `Error: ticket #<id> not found` |
| Status sai | `Error: invalid status "<value>". Allowed: open, in-progress, closed` |
| JSON hỏng | `Error: cannot read <file> (invalid JSON)` |

Các message còn lại (priority sai, id sai, sai cấu trúc, `list` rỗng) và định dạng in của `list` / `show` chưa chốt.

## 2. Danh sách hành vi

### Model — unit
| ID | Hành vi |
|---|---|
| T1 | Thiếu title → lỗi validation `Error: --title is required` (#2) |
| T2 | Title chỉ có khoảng trắng → lỗi như T1 |
| T3 | Title được trim hai đầu |
| T4 | Không truyền status → `open` (#1) |
| T5 | Status ngoài `open \| in-progress \| closed` → lỗi, message liệt kê giá trị hợp lệ (#5) |
| T6 | Không truyền priority → `medium` |
| T7 | Priority ngoài `low \| medium \| high` → lỗi |
| T8 | Không truyền description → `""` |
| T9 | Không truyền tags → `[]` |
| T10 | Chuẩn hoá tags: trim, lowercase, bỏ rỗng (`a,,b`), bỏ trùng (`LMS, lms`), giữ thứ tự đầu tiên |
| T11 | Tách chuỗi tags: `"a, B,a"` → `["a","b"]` |
| T12 | ID hợp lệ là số nguyên dương; `abc`, `0`, `-1`, `1.5` → lỗi validation |

### Service — unit (storage giả trong bộ nhớ)
| ID | Hành vi |
|---|---|
| T13 | `create` khi danh sách rỗng → `id = 1`, ticket đủ 6 field (#1) |
| T14 | `create` khi đã có ticket → `id = max + 1` |
| T15 | `create` với input không hợp lệ → ném lỗi, không gọi ghi |
| T16 | `list` không filter → tất cả ticket, theo `id` tăng dần |
| T17 | Lọc theo status |
| T18 | Lọc theo priority |
| T19 | Lọc kết hợp status + priority (#3) |
| T20 | Lọc theo một tag |
| T21 | Lọc nhiều tag theo AND: ticket thiếu một tag bị loại |
| T22 | Filter tag được chuẩn hoá trước khi so |
| T23 | Không ticket nào khớp → `[]` |
| T24 | Filter status/priority không hợp lệ → lỗi validation |
| T25 | `get` id tồn tại → trả đúng ticket |
| T26 | `get` id không tồn tại → lỗi NotFound (#4) |
| T27 | `updateStatus` thành công → trả ticket đã cập nhật |
| T28 | `updateStatus` sang đúng status hiện tại → thành công |
| T29 | `updateStatus` id không tồn tại → lỗi NotFound |
| T30 | `updateStatus` status không hợp lệ → lỗi, không gọi ghi (#5) |
| T31 | `updateStatus` chỉ đổi ticket đích; ticket khác giữ nguyên |

### Storage — integration (file thật trong thư mục tạm)
| ID | Hành vi |
|---|---|
| T32 | File không tồn tại → đọc ra `[]` |
| T33 | File 0 byte → `[]` |
| T34 | File chỉ có khoảng trắng / xuống dòng → `[]` |
| T35 | File có BOM UTF-8 và JSON hợp lệ → đọc bình thường |
| T36 | Nội dung không phải JSON → lỗi, file giữ nguyên nội dung (#6) |
| T37 | JSON hợp lệ nhưng không phải mảng (`{}`) → lỗi, file giữ nguyên |
| T38 | Ghi rồi đọc lại → cùng dữ liệu (round-trip) |
| T39 | Sau khi ghi, thư mục không còn file tạm |
| T40 | Ghi khi thư mục cha chưa tồn tại → **CHƯA CHỐT** (tự tạo hay báo lỗi) |

### Command — integration (cách chạy in-process / subprocess: chốt ở bước Solution Exploration)
| ID | Hành vi |
|---|---|
| T41 | `create --title "Login lỗi 500" --priority high` (file chưa có) → exit 0; stdout `Created ticket #1`; file `toEqual` `[{ id: 1, title: "Login lỗi 500", description: "", status: "open", priority: "high", tags: [] }]` (#1) |
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
| T61 | `update 1` (thiếu `--status`) → exit 2 |
| T62 | `update 99 --status closed` → exit 1 |
| T63 | Lệnh không tồn tại hoặc option lạ → exit 2 |
| T64 | `create` rồi `list` ở hai lần chạy riêng → dữ liệu còn |

## 3. Còn mở
- T40: thư mục cha của `TICKETS_FILE` chưa tồn tại.
- Message và định dạng output chưa chốt (mục 1).
- Cách chạy command test (Solution Exploration).