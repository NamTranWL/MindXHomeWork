# Solution Exploration — chọn công cụ và thiết kế

**Mục tiêu:** chốt các quyết định thiết kế "sai thì tốn công sửa nhất" trước khi viết test đầu tiên; mỗi quyết định so sánh ít nhất 2 phương án.
**Kết quả:** `docs/DECISIONS.md` — commit `docs(week-2): record design decisions and update spec` (13:11, 01/11/2026), ngay trước vòng T1.

| Bước | Làm gì | Ở đâu bên dưới |
|---|---|---|
| SE-1 Present problem | Đưa spec + ràng buộc | [SE-1](#se-1-present-problem) |
| SE-2 Identify | AI liệt kê 11 quyết định, xếp theo chi phí đổi ý | [SE-2](#se-2-identify--xếp-theo-sai-thì-tốn-công-sửa-nhất) |
| SE-3 Options | So sánh phương án cho 6 quyết định chính | [SE-3](#se-3-options--so-sánh-phương-án) |
| SE-4 Choose with context | Mình chọn; **khác AI ở test runner** và danh sách test subprocess | [SE-4](#se-4-choose-with-context--chỗ-mình-chọn-khác-ai) |
| SE-5 Synthesize | Bảng quyết định: chọn / loại / lý do / rủi ro | `docs/DECISIONS.md` |

---

## SE-1 Present problem

Context đưa cho AI (AI nhắc lại ở đầu câu trả lời SE-3): spec T1–T64 đã chốt ở bước Layered Questioning; **làm một mình trong ~1 tuần; chạy trên Windows/PowerShell; tuần 3 làm tiếp bằng TypeScript + Commander; tuần 1 đã dùng Vitest**.

## SE-2 Identify — xếp theo "sai thì tốn công sửa nhất"

> Những quyết định thiết kế nào cần chốt ngay từ đầu? Xếp theo mức "sai thì tốn công sửa nhất".

AI xếp theo **số file và số test phải sửa nếu đổi ý**:

| Nhóm | # | Quyết định | Vì sao đổi sau tốn công | Chốt ở |
|---|---|---|---|---|
| **1. Trước T1** — đổi sau là sửa gần như mọi file | 1 | Ngôn ngữ, kiểu module, test runner | Mọi file nguồn và test phụ thuộc (import, tsconfig, config runner) | DECISIONS #1–3 |
| | 2 | Interface storage, sync hay async | Đổi sync → async lan qua cả 3 lớp và T13–T40; không có interface thì không có storage giả để test "không gọi ghi" (T15, T30) | DECISIONS #6 |
| | 3 | Command là `run(argv, io)` hay tự in / tự `process.exit` | Tự thoát thì 23 test command chỉ chạy được bằng subprocess; tuần 3 cũng cần truyền client vào | DECISIONS #4, #5 |
| | 4 | Kiểu lỗi, chỗ map exit code, tiền tố `Error: ` | Mọi assertion về message ở cả ba lớp test | DECISIONS #7, #8 |
| **2. Trước lớp tương ứng** | 5 | Validate ở đâu, thứ tự (thiếu title + file hỏng → exit 2 hay 1?) | Thiết kế service và các test chéo lớp T15, T30, T44, T57 | DECISIONS #9 |
| | 6 | Schema dữ liệu trong file | Dữ liệu đã nằm trên đĩa → phải migrate. Lưu ý: id tuần 2 là number, `Document.id` tuần 3 là string — đừng dùng chung kiểu | SPEC mục 1 |
| | 7 | Commander parse option | Message và exit code của ~10 test command | DECISIONS #4, #15, #16 |
| **3. Để sau được** — gọn trong 1 hàm/module | 8 | Rule id hợp lệ, hoa thường status/priority | 1 hàm trong model | DECISIONS #13, #14 |
| | 9 | `TICKETS_FILE` không đặt, tự tạo thư mục cha | Chỗ khởi tạo repository | DECISIONS #10, #11 |
| | 10 | Tên file tạm, thụt lề JSON | `JsonFileRepository` | DECISIONS #17, #18 |
| | 11 | Định dạng in `list`/`show` | 1 module formatter | DECISIONS #21 |

**Bài học:** mục 1–4 quyết định hình dạng của chính file test đầu tiên nên phải chốt trước T1; mục 8–11 chốt ngay tại vòng TDD gặp chúng.

## SE-3 Options — so sánh phương án

| Quyết định | Phương án | AI đề xuất | Lý do chính của AI |
|---|---|---|---|
| Test runner | Vitest · Jest | **Vitest** | Chạy TS/ESM ngay, gần như không cấu hình, đã quen từ tuần 1 — "tiết kiệm khoảng nửa ngày cấu hình"; Jest chỉ là "gợi ý" của plan |
| Thư viện CLI | Commander · yargs · tự parse (`node:util parseArgs`) | **Commander** | Có subcommand, help, `exitOverride()`; kiểu TS có sẵn; khớp tuần 3. Tự parse phải tự viết routing/help và tuần 3 vẫn phải chuyển |
| Cách test lệnh | `spawnSync` · in-process | **Kết hợp**: phần lớn in-process qua `run(argv, io)`; subprocess cho T63, T64 và test "không có stack trace" | Subprocess thật nhất nhưng chậm vài trăm ms/lần trên Windows, khó debug/coverage, bẫy gọi `.cmd` không có shell; in-process vài ms nhưng phải tạo `Command` mới mỗi lần, chặn `process.exit` |
| Đường dẫn file | `TICKETS_FILE` · `--file` · mặc định home | **`TICKETS_FILE`** | Cô lập test dễ; đặt một lần cho cả phiên PowerShell; tuần 3 cũng chọn client qua biến môi trường. Mặc định home nguy hiểm: quên ghi đè là test ghi vào file thật |
| Sinh ID | `max + 1` · UUID | **`max + 1`** | Dễ gõ `show 3`; test xác định trước được. Rủi ro trùng chỉ xảy ra khi ghi đồng thời hoặc có lệnh xoá — tuần này không có |
| Ghi file | Ghi đè trực tiếp · file tạm rồi rename | **File tạm rồi rename** | Ghi đè bị cắt giữa chừng → file "hỏng" → theo spec không bao giờ ghi đè → người dùng bị kẹt. Bẫy: file tạm phải cùng thư mục (tránh `EXDEV`); Windows có thể `EPERM`/`EBUSY` do antivirus |

## SE-4 Choose with context — chỗ mình chọn khác AI

Đối chiếu đề xuất của AI với `DECISIONS.md` mình commit lúc 13:11:

| Quyết định | AI đề xuất | Mình chọn | Lý do mình ghi (DECISIONS) |
|---|---|---|---|
| **Test runner** | Vitest | **Jest + ts-jest + CommonJS** (loại Vitest) | Khớp với plan tuần 3. Chấp nhận rủi ro "chưa quen Jest"; dự phòng: nếu suite chậm thì bật chế độ chỉ biên dịch |
| **Test subprocess** | T63, T64, "không stack trace" | **T41, T44, T54, T56, T63, T64** | Phủ thêm đường thành công thật (T41) và các đường lỗi chính: thiếu title (T44), file hỏng (T54), không tìm thấy (T56) — kiểm exit code và stream thật ở mỗi loại lỗi |
| Thư viện CLI, đường dẫn file, sinh ID, ghi file | như bảng SE-3 | Giữ như AI đề xuất | Trùng với spec đã chốt |

- Sử dụng Jest để chuẩn bị cho tuần sau  

### Rủi ro AI nêu → đã thành quyết định hoặc test

| Rủi ro từ SE-3 | Xử lý |
|---|---|
| Commander lưu option trên instance | Mỗi lần `run()` tạo `Command` mới (DECISIONS #4) |
| Commander mặc định exit 1, tự gọi `process.exit` | `exitOverride()` + map sang exit 2 ở một chỗ (DECISIONS #4, #7; T63) — đã kiểm chứng bằng `verify-commander.cjs` |
| Gọi `.cmd` không có shell bị lỗi trên Windows | Subprocess dùng `process.execPath --import tsx src/cli.ts` (DECISIONS #5) |
| Rename `EPERM`/`EBUSY` trên Windows | Retry tối đa 3 lần; thất bại thì xoá file tạm, ném `StorageError` (DECISIONS #17; **T39a, T39b**) |
| File tạm khác ổ → `EXDEV` | File tạm đặt cùng thư mục với file đích (DECISIONS #17) |
| Tốc độ spawn trên Windows mới là ước tính | Ghi vào "Chưa chốt": đo bằng `Measure-Command`; ngân sách cả suite dưới 10 s |

### Điều chỉnh trong lúc thực hiện (sau 13:11)

Hai quyết định được bổ sung khi agent bắt đầu chạy các vòng TDD (commit `docs(week-2): settle remaining messages...` và `chore(week-2): run ts-jest in transpile-only mode...`):

- **#2 cập nhật:** bật ts-jest chế độ chỉ biên dịch — đúng phương án dự phòng đã ghi từ đầu — để test đỏ vì hành vi thay vì cả file không biên dịch; bù lại bằng script `npm run typecheck`.
- **#20 mới:** giữ Commander 14.0.3 vì Commander 15 chỉ hỗ trợ ESM và cần Node ≥ 22.12, trong khi dự án dùng CommonJS.

## SE-5 Synthesize

AI đề nghị lưu phần so sánh thành `docs/DECISIONS.md`. Bảng cuối gồm 21 quyết định, mỗi dòng có: **đã chọn · bị loại · lý do · rủi ro cần theo dõi**, cộng mục "Chưa chốt".

## Nhìn lại

- Làm tốt: chốt nhóm quyết định "đắt" trước T1; chọn khác AI ở test runner với lý do rõ ràng; mọi rủi ro AI nêu đều có chỗ xử lý hoặc được ghi lại.
- Chưa tốt: trong chat, lượt SE-4 chỉ là "đồng ý với các phương án bạn chọn" — phần cân nhắc của mình chỉ thể hiện trong `DECISIONS.md`, không thể hiện trong hội thoại. Lần sau nên viết rõ context bổ sung và chỗ không đồng ý ngay trong chat.
