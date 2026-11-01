# Quyết định thiết kế — Ticket Manager CLI (tuần 2)

Chốt ngày 2026-11-01, trước vòng TDD đầu tiên, theo workflow Solution Exploration (Explore → Compare → Choose with context). Hành vi chi tiết: `docs/SPEC.md`.

## Bối cảnh ra quyết định

- Làm một mình, khoảng 1 tuần.
- Tuần 3 mở rộng thêm lệnh `kb ...` gọi HTTP API; plan gợi ý TypeScript + Commander.js + Jest. Tuần 1 đã dùng Vitest.
- Chạy trên Windows + PowerShell.
- Muốn test lỗi CLI sát thực tế nhưng cả suite chạy dưới 10 s.
- Rename file trên Windows có thể lỗi khi file đích đang bị khoá (antivirus, indexer, trình soạn thảo), khác với Linux.

## Bảng quyết định

| # | Quyết định | Đã chọn | Bị loại | Lý do | Rủi ro cần theo dõi |
|---|---|---|---|---|---|
| 1 | Ngôn ngữ | TypeScript | JavaScript | Tuần 3 dùng TS, tránh phải chuyển code giữa chừng | Mất thời gian sửa lỗi kiểu ở những vòng đầu |
| 2 | Test runner | Jest + ts-jest | Vitest | Khớp với plan tuần 3 | Chưa quen Jest. ts-jest kiểm tra kiểu ở mỗi file test nên chậm hơn; nếu suite vượt ngân sách thì bật chế độ chỉ biên dịch (`isolatedModules`) |
| 3 | Kiểu module | CommonJS | ESM | ESM trên Jest vẫn cần cờ thử nghiệm | Sau này nếu thêm thư viện chỉ hỗ trợ ESM thì phải cấu hình transform hoặc chọn thư viện khác |
| 4 | Thư viện CLI | Commander | yargs, tự parse `process.argv` | Có sẵn subcommand và help; tuần 3 dùng Commander | Mặc định thoát với exit 1 và tự gọi `process.exit`, nên phải bật `exitOverride()` và tự map sang exit 2. Commander lưu option trên instance, nên mỗi lần chạy phải tạo `Command` mới |
| 5 | Cách test lệnh | Kết hợp: phần lớn in-process qua `run(argv, io)`; T41, T44, T54, T56, T63, T64 chạy subprocess | Chỉ spawnSync; chỉ in-process | Vừa sát thực tế ở các đường lỗi, vừa giữ suite dưới 10 s | Thời gian mỗi lần spawn trên Windows mới là ước tính, cần đo bằng `Measure-Command`. Spawn phải đi qua `process.execPath --import tsx`, không gọi `.cmd`. `cli.ts` phải giữ thật mỏng |
| 6 | Interface storage | `TicketRepository` async (`load`/`save`), truyền vào service | Đồng bộ; service đọc file trực tiếp | Test service dùng được bản giả trong bộ nhớ; cùng mẫu port/adapter với `KBClient` tuần 3 | Ghi đồng thời bị mất dữ liệu (lost update), chấp nhận vì chỉ một người dùng |
| 7 | Mô hình lỗi | `ValidationError` → 2, `NotFoundError` → 1, `StorageError` → 1; chỉ map ở `run()` | Ném `Error` thường rồi đoán exit code theo message | Một chỗ duy nhất quyết định exit code | Lỗi không thuộc ba loại trên (bug) cũng phải trả exit 1, không lộ stack trace |
| 8 | Tiền tố `Error: ` | CLI tự thêm khi in; message của lỗi không chứa tiền tố | Model tự ghi `Error: ` | Model không phụ thuộc cách hiển thị; tuần 3 dùng lại được | Phải giữ đúng một chỗ thêm tiền tố |
| 9 | Thứ tự validate | Validate input trước, đọc file sau | Đọc file trước | Lỗi input luôn ra exit 2, không phụ thuộc trạng thái file | Phải nhớ giữ thứ tự này ở cả `create`, `show`, `update` |
| 10 | Đường dẫn file | `TICKETS_FILE`; nếu chưa đặt thì dùng `./tickets.json` | Cờ `--file`; mặc định trong thư mục home | Test cô lập dễ; tuần 3 cũng chọn client qua biến môi trường | Quên đặt biến thì file nằm theo thư mục đang đứng. Mọi test phải truyền `TICKETS_FILE` tường minh |
| 11 | Thư mục cha chưa có (T40) | Khi ghi thì tự tạo (`mkdir` recursive) | Báo lỗi | Người dùng không phải tự tạo thư mục | Gõ sai đường dẫn sẽ âm thầm tạo thư mục lạ |
| 12 | Sinh ID | `max(id) + 1`, rỗng thì 1 | UUID | Dễ gõ; test xác định trước được | Có thể trùng id nếu sau này thêm lệnh xoá hoặc ghi đồng thời |
| 13 | ID hợp lệ | Regex `^[1-9]\d*$` | `Number()` / `parseInt` | Loại `1e2`, `0x10`, `1.5`, `01`, ` 1` | Người dùng gõ `01` sẽ bị báo lỗi |
| 14 | Hoa thường status/priority | Phân biệt hoa thường; `OPEN` là lỗi | Tự đưa về chữ thường | Đúng với danh sách giá trị trong spec | Không đồng nhất với tags (tags có lowercase) |
| 15 | `--status` của `update` | Tự validate, không dùng `requiredOption` | `requiredOption` | Message và exit code thống nhất với `--title` | Không có |
| 16 | Filter tags | Chuẩn hoá như lúc `create`; truyền lặp lại thì gộp; rỗng thì không lọc | Không chuẩn hoá | Một quy tắc dùng chung cho cả tạo và lọc | Không có |
| 17 | Ghi file | Ghi file tạm cùng thư mục rồi rename; khi gặp `EPERM`/`EACCES`/`EBUSY` thì thử lại tối đa 3 lần (50/100/200 ms); thất bại thì xoá file tạm và ném `StorageError` | Ghi đè trực tiếp | Không bao giờ để file bị cụt, nên quy tắc "file hỏng thì không ghi đè" không làm người dùng bị kẹt | Antivirus hoặc indexer khoá file lâu. Nhánh retry chỉ test được bằng `rename` giả, vì CI chạy Linux không tái hiện được |
| 18 | Định dạng JSON khi ghi | Thụt lề 2 khoảng trắng, có xuống dòng cuối file | Một dòng | Dễ đọc và dễ diff khi mở file | Không có |
| 19 | Dọn thư mục tạm trong test | `fs.rm(..., { recursive, force, maxRetries: 3 })` | `rm` thường | Tránh test chập chờn vì Defender quét `%TEMP%` | Không có |

## Thay đổi đi kèm trong SPEC.md

- T1, T5, T7, T12, T15, T24, T26, T29, T30, T36, T37 ghi rõ lớp lỗi (`ValidationError`, `NotFoundError`, `StorageError`); T1 bỏ tiền tố `Error: ` khỏi message ở model.
- T12 thêm `01`; T15 thêm "không gọi đọc" (theo quyết định #9).
- Thêm T39a, T39b (retry rename); chốt T40 (tự tạo thư mục).
- Ghi rõ test nào của lớp command chạy subprocess.

## Chưa chốt

- Định dạng in của `list` / `show`, message khi `list` rỗng.
- Message cho priority sai, id sai, file sai cấu trúc.
- Đo thời gian một lần spawn trên Windows trước khi viết test subprocess đầu tiên. Ngân sách cả suite: dưới 10 s (theo dõi thủ công, không viết thành test).
