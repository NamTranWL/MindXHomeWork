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
| 2 | Test runner | Jest + ts-jest ở chế độ chỉ biên dịch (`isolatedModules: true`); kiểm tra kiểu bằng `npm run typecheck` (`tsc --noEmit`) | Vitest; ts-jest kiểm tra kiểu trong lúc chạy test | Khớp với plan tuần 3. Chế độ chỉ biên dịch giúp test đỏ vì hành vi (assertion, "is not a function") thay vì cả file không biên dịch được, và chạy nhanh hơn | Lỗi kiểu không làm test đỏ: phải chạy `npm run typecheck` trước mỗi commit green |
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
| 20 | Phiên bản Commander | 14.0.3 | 15.x | Commander 15 chỉ hỗ trợ ESM và cần Node >= 22.12; dự án dùng CommonJS | Khi nâng cấp phải chuyển dự án sang ESM |
| 21 | Message còn lại và định dạng output | Theo `SPEC.md` mục 1 (priority/id sai, sai cấu trúc, ghi lỗi, `list`/`show`/`update`) | Để mở tới lúc làm lớp command | Lớp model và storage cần message cụ thể để assert ngay | Đổi format sau này phải sửa test command |
| 19 | Dọn thư mục tạm trong test | `fs.rm(..., { recursive, force, maxRetries: 3 })` | `rm` thường | Tránh test chập chờn vì Defender quét `%TEMP%` | Không có |

## Thay đổi đi kèm trong SPEC.md

- T1, T5, T7, T12, T15, T24, T26, T29, T30, T36, T37 ghi rõ lớp lỗi (`ValidationError`, `NotFoundError`, `StorageError`); T1 bỏ tiền tố `Error: ` khỏi message ở model.
- T12 thêm `01`; T15 thêm "không gọi đọc" (theo quyết định #9).
- Thêm T39a, T39b (retry rename); chốt T40 (tự tạo thư mục).
- Ghi rõ test nào của lớp command chạy subprocess.

## Chưa chốt

- Đo thời gian một lần spawn trên Windows trước khi viết test subprocess đầu tiên. Ngân sách cả suite: dưới 10 s (theo dõi thủ công, không viết thành test).

---

# Quyết định thiết kế — lệnh `kb` (tuần 3)

Chốt ngày 2026-11-03. Hành vi chi tiết: `docs/SPEC.md` Phần B. Nghiên cứu nền: `docs/KB-RESEARCH.md`.

## Bối cảnh

- Đề yêu cầu tích hợp KB API thật nhưng không cung cấp server, URL hay cách xác thực.
- Thống nhất phạm vi: bỏ KB API thật, tự dựng KB server chạy trên máy theo API contract của đề, để vẫn có `MockKBClient` và `HTTPKBClient` đổi qua biến môi trường.
- Rút spec Phần B từ 63 xuống 30 hành vi tự động. Tuần này viết test cả nhóm theo spec trước rồi mới code, không commit theo từng vòng.

## Bảng quyết định

| # | Quyết định | Đã chọn | Bị loại | Lý do | Rủi ro cần theo dõi |
|---|---|---|---|---|---|
| 22 | Nguồn "HTTP" | KB server local tự viết bằng `node:http`, chạy bằng `npm run kb-server` | KB API thật; chỉ test `HTTPKBClient` bằng `fetch` giả; dùng json-server | Không có server thật. Server local cho phép chạy end-to-end trên máy và trong test. `node:http` không thêm dependency | Contract là do mình đặt, chưa được kiểm với server thật của công ty |
| 23 | Lõi của KB server | Server bọc một `MockKBClient`, chỉ lo phần HTTP | Viết lại logic search/list trong server | Một chỗ duy nhất chứa luật dữ liệu; cùng bộ contract test chạy được cho cả 2 client và kết quả giống hệt nhau | Mock và server không thể lệch nhau, nên contract test không phát hiện được kiểu khác biệt mà một server thật sẽ có |
| 24 | Validate ở đâu | `KBService`, trước khi tạo client; client chỉ lo không tìm thấy / trùng title | Validate trong từng client | Input sai xử lý giống nhau ở cả 2 client, không gửi request rác; lỗi input luôn ra exit 2 kể cả khi cấu hình sai (giữ tinh thần #9) | Server phải tự kiểm kiểu trường cho client khác gọi vào (đã có, trả 400) |
| 25 | `kb` là gì | Nhóm lệnh con của `tickets` | Binary riêng tên `kb` | Dùng lại `run()`, map lỗi, `exitOverride` và cách test in-process | Lệnh dài hơn một chút (`tickets kb ...`) |
| 26 | Biến môi trường | `KB_CLIENT=mock\|http` (mặc định `mock`), `KB_API_URL` (mặc định `http://localhost:4000`) | Bắt buộc `KB_API_URL` khi dùng http | Chạy với server local không cần đặt thêm gì; test và dev mặc định không cần mạng | Quên bật server sẽ gặp `cannot reach KB API` (đã ghi trong USAGE) |
| 27 | Inject client trong test | `run(argv, io, deps?)` với `deps.kbClient` | Đặt biến môi trường cho mọi test | Test lệnh dùng fixture cố định; vẫn có T91, T92, T94 chạy đúng đường biến môi trường | Tham số chỉ dành cho test, CLI thật không dùng |
| 28 | Dữ liệu | Seed 13 tài liệu cho demo (`src/kb/seed.ts`), fixture 4 tài liệu riêng cho test | Một bộ dùng chung | Sửa seed không làm hỏng test; seed đủ cho ví dụ "tra template, tra thông tin team" của đề | Seed không có test chi tiết, chỉ T94 kiểm tối thiểu |
| 29 | Search của mock | Khớp chuỗi con sau khi bỏ dấu, chữ thường; điểm title 3 / tag 2 / content 1; cùng điểm theo id | Semantic search; khớp theo từ | Đơn giản, đoán trước được kết quả để test; tìm tiếng Việt không dấu vẫn ra | Không hiểu từ đồng nghĩa; query ngắn có thể khớp quá rộng |
| 30 | Thứ tự id | So theo phần số (`doc-010` sau `doc-009`), rồi theo chuỗi | So chuỗi thuần | Đúng với cách sinh id `max + 1`, kể cả khi vượt `doc-999` | Id do server khác sinh theo định dạng khác sẽ được so theo chuỗi |
| 31 | Lưu dữ liệu | Mock: trong bộ nhớ của một lần chạy CLI. Server: trong bộ nhớ của tiến trình server | Ghi ra file JSON | Đủ cho demo và test; tránh làm bẩn seed trong git | Tắt server là mất tài liệu đã thêm |
| 32 | Timeout, retry khi gọi HTTP | Chưa làm | `AbortSignal.timeout` + retry | Server chạy trên máy, độ trễ thấp; giữ phạm vi nhỏ | Server treo thì CLI chờ mãi; cần thêm khi dùng server thật |

## Phát hiện khi chạy test

- Bản spec đầu dùng `http://127.0.0.1:9` làm "cổng không ai nghe" cho T92. `fetch` của Node chặn cổng 9 (danh sách cổng "unsafe" theo chuẩn Fetch) trước khi kết nối, nên lỗi không có mã `ECONNREFUSED`. Đổi sang cổng trống thật: mở ở cổng ngẫu nhiên rồi đóng lại.
