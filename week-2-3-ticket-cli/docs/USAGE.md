# Hướng dẫn sử dụng Ticket Manager CLI

`tickets` là công cụ dòng lệnh quản lý ticket, lưu dữ liệu trong một file JSON trên máy. Tài liệu này mô tả cách cài, cấu hình và toàn bộ hành vi của từng lệnh, gồm cả output và lỗi. Hành vi chi tiết dùng để test nằm ở `docs/SPEC.md`.

## 1. Cài đặt

Cần Node >= 20. Trong thư mục `week-2-3-ticket-cli`:

```powershell
npm install
npm run build      # biên dịch ra dist/
npm link           # tạo lệnh `tickets` dùng được ở mọi thư mục
```

Không muốn build hay link thì gọi qua npm, mọi tham số đặt sau `--`:

```powershell
npm run tickets -- list
npm run tickets -- create --title "Login lỗi 500"
```

Gỡ lệnh toàn cục: `npm unlink -g week2-ticket-cli`.

## 2. Cấu hình

| Biến môi trường | Ý nghĩa | Mặc định |
|---|---|---|
| `TICKETS_FILE` | Đường dẫn file JSON chứa ticket | `tickets.json` trong thư mục hiện tại |

```powershell
$env:TICKETS_FILE = "$HOME\tickets.json"      # chỉ có hiệu lực trong cửa sổ PowerShell này
```

- Chưa có file thì các lệnh đọc coi như danh sách rỗng. File chỉ được tạo ở lần ghi đầu tiên (`create`, `update`).
- Thư mục cha chưa tồn tại sẽ được tự tạo khi ghi.
- Không đặt `TICKETS_FILE` thì file nằm theo thư mục bạn đang đứng, nên chạy ở thư mục khác sẽ thấy một danh sách khác.

## 3. Cú pháp chung

```
tickets <lệnh> [tham số] [option]
```

| Lệnh | Việc làm |
|---|---|
| `create` | Tạo ticket mới |
| `list` | Liệt kê ticket, có lọc |
| `show <id>` | Xem chi tiết một ticket |
| `update <id>` | Đổi status của ticket |
| `help [lệnh]` | Xem trợ giúp; tương đương `tickets <lệnh> --help` |

Mỗi option nhận đúng một giá trị ngay sau nó. Giá trị có khoảng trắng phải đặt trong dấu nháy.

**Lưu ý PowerShell:** dấu phẩy là toán tử tạo mảng của PowerShell. Luôn đặt giá trị `--tags` trong dấu nháy: `--tags "lms,login"`.

## 4. Dữ liệu một ticket

| Field | Kiểu | Bắt buộc | Mặc định | Quy tắc |
|---|---|---|---|---|
| `id` | số nguyên dương | tự sinh | id lớn nhất hiện có + 1; danh sách rỗng thì 1 | |
| `title` | chuỗi | có | | Bỏ khoảng trắng hai đầu; rỗng hoặc toàn khoảng trắng là lỗi |
| `description` | chuỗi | không | `""` | Giữ nguyên, kể cả khoảng trắng hai đầu |
| `status` | chuỗi | không | `open` | `open`, `in-progress`, `closed`; phân biệt hoa thường |
| `priority` | chuỗi | không | `medium` | `low`, `medium`, `high`; phân biệt hoa thường |
| `tags` | danh sách chuỗi | không | `[]` | Xem mục 5 |

## 5. Quy tắc tag

Giá trị `--tags` được xử lý theo thứ tự:

1. Tách theo dấu phẩy.
2. Bỏ khoảng trắng hai đầu từng tag.
3. Đưa về chữ thường.
4. Bỏ tag rỗng.
5. Bỏ tag trùng, giữ thứ tự xuất hiện đầu tiên.

Truyền `--tags` nhiều lần thì các giá trị được gộp lại. Khoảng trắng bên trong tag được giữ nguyên. Tag không thể chứa dấu phẩy.

| Nhập | Lưu |
|---|---|
| `--tags "LMS, login,lms"` | `["lms", "login"]` |
| `--tags "a,,b"` | `["a", "b"]` |
| `--tags "a,b" --tags c` | `["a", "b", "c"]` |
| `--tags "Lỗi thanh toán"` | `["lỗi thanh toán"]` |

## 6. Tham chiếu lệnh

### 6.1 `tickets create`

```
tickets create --title <title> [--description <text>] [--status <status>] [--priority <priority>] [--tags <tags>]...
```

| Option | Bắt buộc | Ý nghĩa |
|---|---|---|
| `--title <title>` | có | Tiêu đề |
| `--description <text>` | không | Mô tả |
| `--status <status>` | không | Status ban đầu |
| `--priority <priority>` | không | Độ ưu tiên |
| `--tags <tags>` | không | Tag phân cách bằng dấu phẩy, truyền được nhiều lần |

Thành công: in `Created ticket #<id>`, exit 0.

```powershell
PS> tickets create --title "Login lỗi 500" --priority high --tags "LMS, login"
Created ticket #1
PS> tickets create --title "Trang chủ chậm" --description "Mất 8s khi tải" --status in-progress --tags perf --tags LMS
Created ticket #2
```

Input bị kiểm tra trước khi đọc file. Vì vậy lỗi input luôn trả exit 2 và không đụng tới file, kể cả khi file đang hỏng.

### 6.2 `tickets list`

```
tickets list [--status <status>] [--priority <priority>] [--tags <tags>]...
```

| Option | Ý nghĩa |
|---|---|
| `--status <status>` | Chỉ lấy ticket có status này |
| `--priority <priority>` | Chỉ lấy ticket có priority này |
| `--tags <tags>` | Chỉ lấy ticket có **tất cả** tag được liệt kê; tag lọc được chuẩn hoá như mục 5 (`--tags LMS` khớp `lms`) |

- Mọi điều kiện kết hợp theo AND.
- Kết quả sắp theo id tăng dần.
- Mỗi ticket một dòng: `#<id> [<status>] [<priority>] <title>`, thêm ` (tags: a, b)` nếu có tag.
- Không có ticket nào khớp thì in `No tickets found`, exit 0.
- Lệnh này không tạo và không sửa file.

```powershell
PS> tickets list
#1 [open] [high] Login lỗi 500 (tags: lms, login)
#2 [in-progress] [medium] Trang chủ chậm (tags: perf, lms)
#3 [open] [low] Sai chính tả footer
PS> tickets list --status open
#1 [open] [high] Login lỗi 500 (tags: lms, login)
#3 [open] [low] Sai chính tả footer
PS> tickets list --tags lms --priority high
#1 [open] [high] Login lỗi 500 (tags: lms, login)
PS> tickets list --status closed
No tickets found
```

### 6.3 `tickets show <id>`

```
tickets show <id>
```

`<id>` phải là số nguyên dương viết dạng thập phân, không có số 0 ở đầu. `1` và `42` hợp lệ; `abc`, `0`, `-1`, `1.5`, `01`, `1e2` không hợp lệ.

In 6 dòng; description hoặc tags rỗng thì in `-`. Lệnh này không tạo và không sửa file.

```powershell
PS> tickets show 2
ID: 2
Title: Trang chủ chậm
Description: Mất 8s khi tải
Status: in-progress
Priority: medium
Tags: perf, lms
PS> tickets show 3
ID: 3
Title: Sai chính tả footer
Description: -
Status: open
Priority: low
Tags: -
```

### 6.4 `tickets update <id>`

```
tickets update <id> --status <status>
```

- Chỉ đổi status; `--status` bắt buộc.
- Chuyển tự do giữa ba status. Đổi sang đúng status hiện tại vẫn thành công.
- Các ticket khác giữ nguyên.

```powershell
PS> tickets update 1 --status closed
Updated ticket #1: status = closed
```

## 7. Exit code

| Exit | Khi nào |
|---|---|
| `0` | Thành công, kể cả `list` không có kết quả; `--help` |
| `1` | Lỗi lúc chạy: không tìm thấy ticket, file JSON hỏng hoặc sai cấu trúc, lỗi đọc/ghi file |
| `2` | Input sai: thiếu/sai title, status, priority, id; thiếu `--status`; lệnh hoặc option không tồn tại; thiếu giá trị option; gọi `tickets` không kèm lệnh nào |

Thành công thì kết quả ra stdout, stderr rỗng. Lỗi thì message ra stderr, stdout rỗng, không in stack trace. Script kiểm tra kết quả bằng `$LASTEXITCODE` trong PowerShell.

## 8. Thông báo lỗi

| Tình huống | Message (stderr) | Exit |
|---|---|---|
| Thiếu hoặc rỗng `--title` | `Error: --title is required` | 2 |
| Status sai | `Error: invalid status "<giá trị>". Allowed: open, in-progress, closed` | 2 |
| Priority sai | `Error: invalid priority "<giá trị>". Allowed: low, medium, high` | 2 |
| Id sai | `Error: invalid id "<giá trị>". Expected a positive integer` | 2 |
| `update` thiếu `--status` | `Error: --status is required` | 2 |
| Không tìm thấy ticket | `Error: ticket #<id> not found` | 1 |
| File không phải JSON | `Error: cannot read <file> (invalid JSON)` | 1 |
| File là JSON nhưng không phải mảng | `Error: cannot read <file> (expected a JSON array)` | 1 |
| Không ghi được file | `Error: cannot write <file> (<mã lỗi>)` | 1 |
| Lệnh không tồn tại | `error: unknown command '<lệnh>'` | 2 |
| Option không tồn tại | `error: unknown option '<option>'` | 2 |
| Option thiếu giá trị | `error: option '--title <title>' argument missing` | 2 |
| `show`/`update` thiếu id | `error: missing required argument 'id'` | 2 |

Ba dòng cuối do thư viện Commander sinh ra nên viết thường `error:`.

## 9. File dữ liệu

File là một mảng JSON, thụt lề 2 khoảng trắng:

```json
[
  {
    "id": 1,
    "title": "Login lỗi 500",
    "status": "closed",
    "priority": "high",
    "description": "",
    "tags": ["lms", "login"]
  }
]
```

Thứ tự field trong file không quan trọng.

| Trạng thái file | Hành vi |
|---|---|
| Không tồn tại | Coi như danh sách rỗng |
| 0 byte, hoặc chỉ có khoảng trắng / xuống dòng | Coi như danh sách rỗng |
| Có BOM UTF-8 (thường gặp khi lưu bằng Notepad cũ) | BOM được bỏ qua, đọc bình thường |
| Không phải JSON | Lỗi exit 1, **không bao giờ ghi đè** |
| JSON nhưng không phải mảng (ví dụ `{}`) | Lỗi exit 1, không ghi đè |

- Khi ghi, CLI ghi ra file tạm cùng thư mục rồi đổi tên đè lên file chính. Nhờ vậy file không bao giờ bị cụt dù bị ngắt giữa chừng.
- Trên Windows, nếu đổi tên bị lỗi `EPERM`/`EACCES`/`EBUSY` (thường do antivirus hoặc trình soạn thảo đang mở file), CLI thử lại tối đa 3 lần (chờ 50, 100, 200 ms). Vẫn lỗi thì báo `cannot write`, xoá file tạm và giữ nguyên file cũ.
- CLI không kiểm tra từng field của phần tử trong mảng. Sửa tay file mà ghi sai kiểu dữ liệu có thể làm output sai.

## 10. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Tiếng Việt hiện thành ký tự lạ trong PowerShell 5.1 | Console không dùng UTF-8 | `[Console]::OutputEncoding = [Text.Encoding]::UTF8` |
| `tickets` không được nhận diện là lệnh | Chưa `npm run build` + `npm link`, hoặc mở terminal trước khi link | Build và link lại, mở cửa sổ PowerShell mới, hoặc dùng `npm run tickets -- ...` |
| Danh sách khác nhau giữa các thư mục | Chưa đặt `TICKETS_FILE` | Đặt `TICKETS_FILE` trỏ tới một file cố định |
| `cannot read ... (invalid JSON)` | File bị sửa tay sai cú pháp | Sửa lại cho đúng JSON hoặc đổi tên file để bắt đầu danh sách mới |
| `cannot write ... (EPERM)` | File đang bị chương trình khác khoá | Đóng chương trình đang mở file rồi chạy lại |
| Tag bị tách sai trên PowerShell | Giá trị `--tags` không có dấu nháy | Viết `--tags "a,b"` |

## 11. Giới hạn hiện tại

- Không có lệnh xoá ticket, không sửa title/description/priority/tags sau khi tạo.
- Không có `createdAt`/`updatedAt`.
- Không xử lý hai lệnh ghi chạy đồng thời trên cùng file: lần ghi sau có thể đè mất thay đổi của lần trước.
- Id được tính bằng `max(id) + 1`, nên nếu sau này có lệnh xoá thì id lớn nhất có thể bị dùng lại.

## 12. Knowledge Base: lệnh `tickets kb` (tuần 3)

Nhóm lệnh `kb` tra cứu Knowledge Base: template email/SMS/Teams, thông tin team, hướng dẫn và runbook. Lệnh `kb` không đọc hay ghi `tickets.json`. Hành vi chi tiết: `docs/SPEC.md` Phần B.

### 12.1 Chọn nguồn dữ liệu

| Biến môi trường | Giá trị | Mặc định | Ý nghĩa |
|---|---|---|---|
| `KB_CLIENT` | `mock` hoặc `http` (chữ thường) | `mock` | `mock`: dữ liệu seed trong bộ nhớ của lần chạy CLI. `http`: gọi KB server |
| `KB_API_URL` | URL `http://` hoặc `https://` | `http://localhost:4000` | Địa chỉ KB server khi `KB_CLIENT=http` |
| `KB_PORT` | số cổng | `4000` | Cổng mà `npm run kb-server` lắng nghe |

**Dùng mock (khi dev, không cần mạng):** không cần đặt gì. Mỗi lần chạy CLI bắt đầu lại từ 13 tài liệu seed, nên tài liệu thêm bằng `kb add` mất ngay sau lệnh đó.

**Dùng HTTP với KB server chạy trên máy:**

```powershell
# Terminal 1
npm run kb-server
# KB server listening on http://localhost:4000 (13 documents)

# Terminal 2
$env:KB_CLIENT = "http"
npm run tickets -- kb search login
```

KB server giữ dữ liệu trong bộ nhớ cho tới khi tắt (Ctrl+C), nên `kb add` rồi `kb retrieve` ở hai lần chạy CLI khác nhau vẫn thấy tài liệu mới. Khởi động lại server thì quay về seed. Đổi cổng: `$env:KB_PORT = "4123"` ở terminal 1 và `$env:KB_API_URL = "http://localhost:4123"` ở terminal 2. Quay lại mock: `Remove-Item Env:KB_CLIENT`.

### 12.2 `tickets kb search <query> [--top-k n]`

Tìm từ khoá trong title, tags và content. Không phân biệt hoa thường và không phân biệt dấu (`dang nhap` khớp `đăng nhập`). Kết quả xếp theo trường khớp: title trước tag, tag trước content; cùng mức thì theo id. `--top-k` từ 1 đến 50, mặc định 5.

```powershell
npm run tickets -- kb search "đăng nhập" --top-k 3
# doc-012 /runbooks/login Runbook: Xử lý lỗi đăng nhập LMS (match: title)
# doc-001 /templates/email Email ACK – Login issue (match: content)
# doc-002 /templates/email Email resolution – Đã reset mật khẩu (match: content)
```

### 12.3 `tickets kb list --node <path> [--limit n] [--recursive]`

Liệt kê tài liệu trong một node, theo id tăng dần. Mặc định chỉ lấy đúng node đó; thêm `--recursive` để lấy cả node con. `/templates/email/` và `/templates//email` được hiểu là `/templates/email`; hoa thường được giữ nguyên. `--limit` từ 1 đến 100, mặc định 10. Xem toàn bộ KB: `kb list --node / --recursive --limit 100`.

```powershell
npm run tickets -- kb list --node /team --recursive
# doc-007 /team/devops DevOps – Thành viên và kênh liên hệ (tags: team, devops, contact)
# doc-008 /team/devops DevOps – Lịch on-call (tags: team, devops, on-call, schedule)
# doc-009 /team/support Support – Ca trực và bàn giao (tags: team, support, schedule)
```

### 12.4 `tickets kb retrieve <id>`

In 4 dòng thông tin (`ID`, `Title`, `Node`, `Tags`), một dòng trống, rồi toàn bộ nội dung.

### 12.5 `tickets kb add --file <file> --path <node> [--title <title>] [--tags <tags>]`

Thêm tài liệu từ một file markdown (UTF-8, có hay không có BOM đều được). Title lấy theo thứ tự: `--title`, dòng `# ...` đầu tiên trong file, tên file bỏ đuôi. Không được trùng title (không phân biệt hoa thường và dấu) trong cùng node. `--tags` theo đúng quy tắc tag ở mục 5.

```powershell
npm run tickets -- kb add --file evidence/week-3/sms-nhac-hoc-bu.md --path /templates/sms --tags sms,schedule
# Added document doc-014 at /templates/sms
```

### 12.6 Dữ liệu seed

| Node | Tài liệu |
|---|---|
| `/templates/email` | doc-001 ACK login · doc-002 resolution reset mật khẩu · doc-003 ACK sự cố Priority · doc-004 follow-up |
| `/templates/sms` | doc-005 thông báo bảo trì |
| `/templates/teams` | doc-006 escalation cho dev team |
| `/team/devops` | doc-007 thành viên và kênh liên hệ · doc-008 lịch on-call |
| `/team/support` | doc-009 ca trực và bàn giao |
| `/docs/guides` | doc-010 phân loại Class of Service · doc-011 quy trình 7 bước |
| `/runbooks/login`, `/runbooks/performance` | doc-012 lỗi đăng nhập LMS · doc-013 Denise tải chậm |

Nội dung là dữ liệu mẫu, không có tên hay email người thật. Sửa seed ở `src/kb/seed.ts`.

### 12.7 Lỗi thường gặp

| Message | Exit | Cách xử lý |
|---|---|---|
| `query is required`, `--node is required`, `invalid node path ...`, `invalid --top-k ...`, `invalid --limit ...` | 2 | Sửa lại input theo mục tương ứng ở trên |
| `document <id> not found` | 1 | Kiểm tra id bằng `kb search` hoặc `kb list` |
| `document "<title>" already exists at <node> (<id>)` | 1 | Đổi title (`--title`) hoặc thêm vào node khác |
| `cannot read <file> (ENOENT)` / `file <file> is empty` | 1 / 2 | Kiểm tra đường dẫn và nội dung file |
| `invalid KB_CLIENT "<value>". Allowed: mock, http` | 2 | Đặt `KB_CLIENT` là `mock` hoặc `http` (chữ thường) |
| `cannot reach KB API at <url> (ECONNREFUSED)` | 1 | Chưa bật KB server hoặc sai cổng: chạy `npm run kb-server`, kiểm tra `KB_API_URL` |
