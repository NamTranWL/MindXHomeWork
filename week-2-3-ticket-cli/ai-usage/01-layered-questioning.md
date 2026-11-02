# Layered Questioning — hiểu bài trước khi viết test

**Mục tiêu:** đi từ khái niệm chung tới danh sách hành vi cụ thể để viết test, chưa viết code.
**Kết quả:** `docs/SPEC.md` với 64 hành vi T1–T64; mọi điểm AI nêu ra đều có quyết định của mình.

| Lớp | Câu hỏi | Mục đích |
|---|---|---|
| LQ-1 Research | Khái niệm cần nắm khi viết CLI bằng Node + TypeScript | Nền tảng |
| LQ-2 Brief | Áp vào Ticket Manager: cần test những hành vi nào, ở tầng nào | Danh sách hành vi |
| (chốt) | AI chỉ ra rủi ro, mâu thuẫn → mình chốt từng điểm | Spec không còn mập mờ |
| LQ-3 Example | Ví dụ 1 vòng Red → Green và 1 integration test subprocess | Hiểu cách làm, phát hiện lỗ hổng spec |
| LQ-4 Validation | Edge case nào cần test; file hỏng xử lý sao; làm sao biết test đủ chặt | Bổ sung edge case, chống "xanh giả" |

---

## LQ-1 Research

> Khi viết CLI bằng Node + TypeScript, các khái niệm nào mình cần nắm? Giải thích ngắn: parse tham số/cờ, exit code (0, 1, 2 nên dùng khi nào), stdout vs stderr, ghi file JSON an toàn (ghi đè trực tiếp vs ghi file tạm rồi rename).

**Áp dụng vào spec:**
- Exit code 3 mức: `0` thành công, `1` lỗi lúc chạy (không tìm thấy, file hỏng, I/O), `2` input sai (SPEC mục 1).
- Thành công → stdout, stderr rỗng; lỗi → stderr, stdout rỗng, không stack trace.
- Ghi file tạm rồi rename (DECISIONS #17; test T39, T39a, T39b).

[_Câu trả lời đầy đủ của AI: xem hội thoại gốc._](https://claude.ai/share/1cc64ee5-d1fe-48f8-85fa-438c013925cc)

## LQ-2 Brief Feature → AI chỉ ra rủi ro và mâu thuẫn

Sau khi mình đưa 6 test case từ tuần 1 và các quyết định ban đầu (priority `low|medium|high` mặc định `medium`, lọc tag AND, tag chuẩn hoá về chữ thường, chuyển status tự do, file 0 byte = rỗng, chưa có `createdAt`), AI phản biện lại 11 điểm. Đây là phần **critical thinking hai chiều**: mình quyết, AI soi hệ quả.

| # | AI chỉ ra | Mình chốt | Nằm ở |
|---|---|---|---|
| 1 | `requiredOption("--title")` của Commander tự báo lỗi riêng và exit 1, đụng với test #2 (cần `Error: --title is required`, exit 2) | `--title` là option thường, tự validate trong model | T1, T44; DECISIONS #15 |
| 2 | Expected của test #1 thiếu `description: ""`, `tags: []` nếu dùng `toEqual` | Giữ `toEqual` (so khớp chính xác), cập nhật expected | T13, T41 |
| 3 | `--tags a --tags b` mặc định chỉ giữ `b` — mất dữ liệu âm thầm | **Gộp** các lần truyền | T43; DECISIONS #16 |
| 4 | Filter `list` cũng phải chuẩn hoá tag; `list --status done` nên exit 2 | Đồng ý cả hai | T22, T24, T52, T53 |
| 5 | File có BOM (Notepad/PowerShell) bị `JSON.parse` báo hỏng | Bỏ BOM trước khi parse | T35 |
| 6 | File chỉ có khoảng trắng: rỗng hay hỏng? | Coi như rỗng | T34 |
| 7 | JSON hợp lệ nhưng không phải mảng (`{}`) | Hỏng → exit 1, không ghi đè; chỉ kiểm cấp ngoài cùng | T37 |
| 8 | Tag không chứa được dấu phẩy | Đồng ý, ghi vào tài liệu | `docs/USAGE.md` mục 5 |
| 9 | `update` sang đúng status hiện tại | Thành công, exit 0 | T28, T59 |
| 10 | ID hợp lệ là số nguyên dương | Đồng ý | T12, T57 |
| 11 | Title chỉ toàn khoảng trắng | Lỗi như thiếu title | T2, T45 |

### Kiểm chứng độc lập các khẳng định về Commander

AI tự nói rõ phần nó đọc là bản fork có thể cũ, và *"mình nhớ là 1, nhưng chưa kiểm chứng"*. Vì vậy không ghi thẳng vào spec mà kiểm bằng script [verify-commander.cjs](verify-commander.cjs) trên đúng phiên bản dự án dùng:

```
> node ai-usage/verify-commander.cjs
commander 14.0.3

1) requiredOption("--title") nhưng không truyền --title:
{ ok: false, exitCode: 1, code: 'commander.missingMandatoryOptionValue',
  stderr: "error: required option '--title <title>' not specified" }

2) --tags khai báo bình thường, truyền 2 lần (--tags a --tags b):
{ ok: true, opts: { tags: 'b' } }

3) --tags với hàm gộp collect, truyền 2 lần:
{ ok: true, opts: { tags: [ 'a', 'b' ] } }

4) Lệnh/option lạ khi đã bật exitOverride (mã gốc của Commander, trước khi map sang 2):
{ ok: false, exitCode: 1, code: 'commander.unknownOption', stderr: "error: unknown option '--bogus'" }
```

**Kết luận:** cả 4 khẳng định của AI đúng với Commander 14.0.3 → giữ quyết định #1, #3; bật `exitOverride()` và tự map lỗi Commander sang exit 2 (DECISIONS #4, test T63).

## LQ-3 Code Example

> Cho mình ví dụ nhỏ: 1 unit test đỏ cho createTicket (status mặc định là "open"), rồi code tối thiểu để nó xanh. Giải thích vì sao đó là "tối thiểu". Sau đó cho 1 ví dụ integration test chạy CLI bằng tiến trình con với thư mục tạm riêng cho mỗi test.

**Điều học được và đã áp dụng:**

| AI giải thích / đề xuất | Áp dụng |
|---|---|
| Đỏ vì `Cannot find module` chưa chứng minh assertion có tác dụng → thêm stub đúng chữ ký, trả sai giá trị | Đa số log đỏ trong `evidence/` là lỗi assertion; các trường hợp còn lại được ghi chú trong README |
| Green tối thiểu theo kỹ thuật **Fake It**: trả cứng giá trị, để test sau buộc tổng quát hoá | T1 green của mình chỉ `throw new ValidationError('--title is required')` (xem [03](03-tdd-execution.md)) |
| **Lỗ hổng spec:** không có test "truyền status/priority thì được giữ nguyên" → bản trả cứng `'open'` xanh mãi | Thêm **T5b**, **T7b** (unit) và **T41b** (integration) |
| Subprocess dùng `process.execPath` + mảng tham số, không qua shell (tránh lỗi quoting PowerShell, `npx.cmd`) | `tests/helpers/cli.ts`; DECISIONS #5 |
| Rủi ro test subprocess chạy trên `dist/` cũ | Subprocess chạy thẳng `src/cli.ts` qua `tsx`, không phụ thuộc bước build |
| Subprocess chậm → dữ kiện cho bước Solution Exploration | Phần lớn test command chạy in-process; chỉ 6 test subprocess (DECISIONS #5) |

## LQ-4 Validation

> Những edge case nào mình nên test cho: input sai (thiếu title, priority/status không hợp lệ, id không phải số), ticket không tồn tại, file JSON thiếu hoặc hỏng? Với file hỏng thì CLI nên báo lỗi hay tự tạo file mới, ưu/nhược từng cách? Làm sao biết bộ test của mình đủ chặt (không xanh giả)?

### Đề xuất đã áp dụng

| AI đề xuất | Mình quyết | Nằm ở |
|---|---|---|
| Kiểm ID bằng regex `^[1-9]\d*$` thay vì `parseInt`/`Number` (bẫy `1abc`, `01`, `1e2`, `" 1"`) | Dùng regex | DECISIONS #13; T12 (có `01`) |
| `--priority HIGH`, `--status Open`: chuẩn hoá hay báo lỗi? | Phân biệt hoa thường, báo lỗi | DECISIONS #14 |
| `list --tags ""`: không lọc hay báo lỗi? | Không lọc | DECISIONS #16 |
| `TICKETS_FILE` không đặt thì sao? | Mặc định `./tickets.json` | DECISIONS #10 |
| Rủi ro từ quyết định 7: `[null]` có thể gây `TypeError` kèm stack trace → thêm lớp bắt lỗi chung | Chọn phương án 1: lỗi ngoài 3 loại đã biết → exit 1, không stack trace | DECISIONS #7; `reportError` trong `src/commands/run.ts` |
| Lỗi option lạ / thiếu giá trị của Commander cần map sang exit 2 | `exitOverride()` + map | DECISIONS #4; T63 |
| File hỏng: báo lỗi / tự tạo mới / backup / `--repair` | Giữ **báo lỗi, không ghi đè** (an toàn dữ liệu, fail-fast); giữ message đã chốt | T36, T47, T54 |
| `toThrow()` không kèm loại lỗi thì bug nào cũng làm test xanh | Assert cả lớp lỗi lẫn message chính xác | Ví dụ T1, T12 trong `tests/unit/models/ticket.test.ts` |
| Assert cả điều **không** được xảy ra: storage giả đếm số lần đọc/ghi | T15 kiểm `loadCalls === 0` và `saves` rỗng khi validate thất bại | T15 |
| Đặt ID vào tên test để truy vết spec | Mọi test có tiền tố `Tn:` | `tests/**` |
| Triangulation: mỗi luật ít nhất 2 input | Ví dụ T13/T14 (id = 1 và id = max + 1), T4/T5b | SPEC |

### Chưa áp dụng (ghi nhận để làm sau)

| Đề xuất | Lý do chưa làm |
|---|---|
| Test riêng cho `1abc`, `1e2`, `0x1`, `" 1"`, ID vượt `MAX_SAFE_INTEGER` | Regex đã chặn trong code, nhưng T12 mới có test cho `abc`, `0`, `-1`, `1.5`, `01` |
| JSON bị cắt cụt `[{"id":1`, nội dung `null`/`"abc"`/`123` | T36, T37 đã phủ dạng tiêu biểu (không phải JSON; `{}`) |
| `TICKETS_FILE` trỏ vào thư mục (`EISDIR`), file read-only | Khó dựng ổn định trên Windows; đã có lớp bắt lỗi chung |
| `show -1` (Commander hiểu là option), `update --priority` | Đều ra exit 2 qua đường lỗi Commander, chưa có test riêng |
| Mutation testing tự động (StrykerJS), `jest --randomize` | Ngoài phạm vi tuần 2; mutation thủ công đã làm ở tuần 1 |
