# Nghiên cứu: Test-Driven Development với quy trình AI có kiểm soát

> Bài tập Week 1 · MindX. Phần thực hành nằm ở thư mục `parallel-tests/` (tính năng "Leave & Standby Modal").

## 1. Nguyên lý cốt lõi

**TDD (Test-Driven Development)** là cách viết phần mềm trong đó **test được viết trước code**. Test đóng vai trò bản đặc tả có thể chạy được: nó nói rõ code phải làm gì, và máy kiểm chứng điều đó mỗi lần chạy.

Vòng lặp **Red → Green → Refactor**, mỗi vòng thật nhỏ (vài phút):

| Pha | Làm gì | Dấu hiệu xong |
|---|---|---|
| **Red** | Viết một test cho một hành vi chưa có. Chạy và thấy nó **đỏ đúng lý do** (thiếu hàm, sai kết quả), không phải lỗi cú pháp của test. | Test fail, thông báo lỗi chỉ đúng vào hành vi còn thiếu |
| **Green** | Viết **lượng code ít nhất** để test xanh. Chưa cần đẹp. | Mọi test xanh |
| **Refactor** | Dọn code (đặt tên, tách hàm, bỏ trùng lặp) **mà không đổi hành vi**. Test là lưới an toàn. | Vẫn xanh, code sạch hơn |

Ba luật của Kent Beck / Uncle Bob:
1. Không viết code production khi chưa có test đỏ đòi hỏi nó.
2. Chỉ viết test vừa đủ để đỏ.
3. Chỉ viết code vừa đủ để test đó xanh.

**Lợi ích:** thiết kế được nghĩ từ phía người dùng code (API rõ ràng), lỗi lộ ra sớm, refactor không sợ vỡ, test trở thành tài liệu sống.
**Chi phí:** chậm hơn lúc đầu; test viết sai thì "xanh giả"; khó áp vào phần UI thay đổi liên tục hoặc khi yêu cầu còn mơ hồ.

## 2. Các tầng test (Testing Pyramid)

```
        ▲   E2E          ít, chậm, đắt — chứng minh cả hành trình chạy được
       ▲▲▲  Integration  vừa — các phần ghép với nhau đúng
     ▲▲▲▲▲▲ Unit         nhiều, nhanh (ms), rẻ — luật nghiệp vụ đúng
```

| Tầng | Phạm vi | Công cụ (JS/TS) | Ví dụ trong bài |
|---|---|---|---|
| **Unit** | Một hàm/lớp, không mạng, không DB, không UI | Vitest, Jest | `getHospitalWeek('2026-10-12')` → T6 09/10 → T5 15/10 |
| **Integration** | Nhiều phần chạy cùng nhau: component + state + API (mock) | React Testing Library, Supertest | Render `<LeaveModal />`, click ô → hiện badge "Leave", bảng tự cập nhật |
| **E2E** | Toàn bộ app trong trình duyệt thật, như người dùng | Playwright, Cypress | Mở màn Scheduling → bấm khoa → sửa → Save → kiểm payload gửi đi |

Nguyên tắc chia: luật nghiệp vụ càng nhiều nhánh thì càng nên nằm ở **unit** (nhanh, chỉ đúng chỗ sai). Integration kiểm việc "nối dây". E2E chỉ giữ vài luồng quan trọng nhất vì chậm và dễ chập chờn. Trong bài: **34 unit · 19 integration · 4 E2E**.

## 3. Test giúp kiểm soát code do AI sinh ra

AI viết code nhanh nhưng có thể **tự tin mà sai**: hiểu sai yêu cầu, bỏ sót trường hợp biên, hoặc "sửa test cho xanh". TDD biến test thành **hợp đồng** mà AI phải thỏa:

1. **Người viết test trước** (hoặc duyệt kỹ test do AI đề xuất) → yêu cầu được khóa thành thứ chạy được, không còn là lời nói mơ hồ.
2. **AI chỉ được sửa `src/`**, không được sửa test. Test đổi thì người phải duyệt lý do.
3. **Chạy test sau mỗi lần AI sinh code**: đỏ thì đưa nguyên thông báo lỗi lại cho AI. Đây là vòng phản hồi khách quan, không dựa vào việc AI "nói là xong".
4. **Kiểm tra chính bộ test** (test của test):
   - Pha Red phải đỏ **đúng lý do**.
   - **Mutation check:** cố tình làm hỏng code (bỏ một điều kiện, đổi một hằng số) thì phải có test đỏ. Nếu vẫn xanh nghĩa là test quá lỏng.
5. **Guardrails** khi giao việc cho AI: cấm `setTimeout`/sleep (chống flaky), cấm gọi endpoint thật, bắt so khớp **chính xác** câu lỗi, tìm phần tử theo role/tên thay vì CSS.

**Đã áp dụng trong bài:**
- Chạy `npm test` trên thư mục chưa có `src/` → 2 file đỏ vì `Failed to resolve import "../../src/leave/leaveLogic"`. Lưu ý: đây là Red do **thiếu module**, chỉ chứng minh code chưa tồn tại, chưa chứng minh test đo đúng hành vi. Vì vậy có thêm một vòng TDD theo hành vi ở mục 7.
- Viết một bản cài đặt tham chiếu tạm (không nộp) → **51/51** test Vitest (nay là 53/53 sau khi thêm `summarizeCoverage`) và **4/4** test Playwright xanh, chạy lặp 5 lần × 4 luồng song song vẫn **20/20** xanh (không flaky). Vậy bộ test là khả thi, không đòi điều mâu thuẫn.
- Mutation:
  - Bỏ luật "1 người dự phòng/ngày" → **1** test đỏ.
  - Đổi đầu tuần từ Thứ 6 sang Thứ 2 → **11** test đỏ.

  Test bắt được lỗi thật.

## 3b. Bốn lỗi testing thường gặp (và cách bài này tránh)

| Lỗi | Ví dụ cụ thể | Hậu quả | Cách tránh (áp dụng trong bài) |
|---|---|---|---|
| **Over-testing** | Viết E2E cho từng biến thể ngày trong tuần (T6, T7, CN…) thay vì unit | Suite chậm, dễ flaky, một thay đổi UI làm đỏ hàng chục test | Biến thể nghiệp vụ nằm ở unit (`it.each` 6 ngày trong `leaveLogic.test.ts`, chạy vài ms). E2E chỉ giữ **4** hành trình chính |
| **Weak assertions** | `expect(rows.length).toBeGreaterThan(0)` hoặc `expect(screen.getByText(/error/i))` | Code sai vẫn xanh ("xanh giả"); mutation không bị bắt | So khớp **toàn bộ** object bằng `toEqual`, câu lỗi đúng từng chữ, payload Save kiểm bằng schema `zod`. Mutation check ở mục 3 và mục 7 chứng minh test đỏ khi code bị làm hỏng |
| **Testing implementation details** | Tìm ô bằng `.leave-cell.active`, kiểm `useState` được gọi, mock `buildAssigneeChanges` trong test của modal | Refactor (đổi tên class, tách component) làm đỏ test dù hành vi không đổi | Tìm phần tử theo **role + accessible name** (Testing Library). Chỉ mock ranh giới mạng (`leaveApi`), không mock logic nội bộ. Kết quả: tách `LeaveGrid`/`AssigneeChangesTable` ở pha Refactor mà không sửa dòng test nào |
| **Blind trust in AI** | AI nói "đã sửa xong, test pass" nhưng không chạy; hoặc AI sửa expected trong test cho khớp code sai | Lỗi lọt vào bài nộp; test mất vai trò hợp đồng | AI không được sửa test. Luôn **tự chạy** `npm test` và đọc output; dùng mutation check để kiểm chính test. Phân biệt rõ "AI tự xác nhận" với "kiểm chứng độc lập" (mục 6) |

## 4. Test cho ứng dụng dòng lệnh (CLI)

Với một CLI (ví dụ `todo add "Mua sữa"`), cần test 4 nhóm:

| Nhóm | Kiểm cái gì |
|---|---|
| **Lệnh (commands)** | Mỗi lệnh chạy đúng: `add`, `list`, `done`, `--help`, `--version`; nội dung in ra stdout; **exit code = 0** khi thành công |
| **Kiểm tra đầu vào (validation)** | Thiếu tham số, tham số rỗng, sai kiểu (`done abc`), id không tồn tại, cờ không hợp lệ → thông báo rõ + exit code ≠ 0 |
| **Lưu trữ file (file storage)** | Tạo file khi chưa có, ghi đúng định dạng (JSON), đọc lại sau khi chạy lệnh khác, file hỏng/không phải JSON, không có quyền ghi. **Luôn dùng thư mục tạm riêng cho mỗi test**, không đụng file thật |
| **Lỗi (errors)** | Lỗi in ra **stderr** (không lẫn vào stdout), exit code khác nhau cho từng loại lỗi, không in stack trace cho người dùng, dữ liệu cũ không bị mất khi lỗi |

Ví dụ (Vitest + `spawnSync`, CLI giả định `bin/todo.js` lưu vào file chỉ định bằng biến môi trường `TODO_FILE`):

```ts
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

let file: string;
function todo(...args: string[]) {
  const r = spawnSync('node', ['bin/todo.js', ...args], {
    env: { ...process.env, TODO_FILE: file },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'todo-')), 'todo.json'); // mỗi test một thư mục riêng
});

describe('commands', () => {
  it('add rồi list hiện đúng công việc', () => {
    expect(todo('add', 'Mua sữa')).toMatchObject({ code: 0, out: 'Added #1: Mua sữa\n' });
    expect(todo('list').out).toBe('#1 [ ] Mua sữa\n');
  });
  it('done đánh dấu hoàn thành', () => {
    todo('add', 'Mua sữa');
    expect(todo('done', '1').code).toBe(0);
    expect(todo('list').out).toBe('#1 [x] Mua sữa\n');
  });
});

describe('validation', () => {
  it('add thiếu nội dung → lỗi rõ ràng, exit 2', () => {
    expect(todo('add')).toMatchObject({ code: 2, out: '', err: 'Error: task text is required\n' });
  });
  it('done với id không phải số', () => {
    expect(todo('done', 'abc')).toMatchObject({ code: 2, err: 'Error: id must be a positive integer\n' });
  });
});

describe('file storage', () => {
  it('lưu JSON đúng định dạng, đọc lại được sau lần chạy khác', () => {
    todo('add', 'A');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([{ id: 1, text: 'A', done: false }]);
  });
  it('file hỏng → báo lỗi, KHÔNG ghi đè mất dữ liệu', () => {
    writeFileSync(file, '{not json');
    expect(todo('list')).toMatchObject({ code: 1, err: `Error: cannot read ${file} (invalid JSON)\n` });
    expect(readFileSync(file, 'utf8')).toBe('{not json');
  });
});

describe('errors', () => {
  it('lệnh không tồn tại → stderr + exit 2, không in stack trace', () => {
    const r = todo('fly');
    expect(r.code).toBe(2);
    expect(r.err).toBe('Error: unknown command "fly". Run "todo --help".\n');
    expect(r.err).not.toMatch(/at .*\.js:\d+/);
  });
});
```

### 4.1. Áp vào Ticket Manager (chuẩn bị Week 2)

Chưa xây CLI, chỉ đặc tả test case. Giả định CLI `tickets` lưu dữ liệu vào file JSON chỉ định bằng biến `TICKETS_FILE` (mỗi test một thư mục tạm, như ví dụ `todo` ở trên).

| # | Input | Expected | Tầng test |
|---|---|---|---|
| 1 | `tickets create --title "Login lỗi 500" --priority high` (file chưa tồn tại) | exit 0; stdout `Created ticket #1`; file JSON có `{ id: 1, title: "Login lỗi 500", status: "open", priority: "high" }` | CLI integration (subprocess + file tạm). Luật mặc định `status = open` thêm unit test cho hàm `createTicket` |
| 2 | `tickets create --priority high` (thiếu `--title`) | exit 2; stderr `Error: --title is required`; stdout rỗng; file không bị tạo/đổi | Unit (validate) + 1 CLI test cho exit code/stderr |
| 3 | Có 3 ticket (open/high, open/low, closed/high) → `tickets list --status open --priority high` | exit 0; chỉ in ticket #1; không in 2 ticket còn lại | Unit cho hàm lọc (`filterTickets`), 1 CLI test cho cách parse cờ |
| 4 | `tickets show 99` (ID không tồn tại) | exit 1; stderr `Error: ticket #99 not found`; không in stack trace | CLI integration |
| 5 | `tickets update 1 --status done` (trạng thái hợp lệ chỉ `open \| in-progress \| closed`) | exit 2; stderr `Error: invalid status "done". Allowed: open, in-progress, closed`; ticket #1 giữ nguyên trong file | Unit (validate status) + CLI kiểm dữ liệu không đổi |
| 6 | File `tickets.json` chứa `{not json` → `tickets list` | exit 1; stderr `Error: cannot read <file> (invalid JSON)`; **file giữ nguyên nội dung** (không bị ghi đè) | CLI integration (file storage) |

Nguyên tắc chia tầng giống bài Leave & Standby: luật (validate, lọc, mặc định) ở unit; CLI test chỉ kiểm phần "nối dây": parse tham số, stdout/stderr, exit code, đọc/ghi file.

## 5. Bài thực hành: Leave & Standby Modal

Viết **chỉ test** (pha Red) cho tính năng: bấm "Geriatrics Department" trên màn Scheduling mở modal gồm:
- lưới nghỉ một tuần BV (T6 → T5), mỗi ngày chia sáng/chiều, bấm ô để bật/tắt nghỉ;
- mỗi ngày đúng 1 người dự phòng;
- bảng "Procedure assignee changes" tự sinh.

Tiến trình:

1. **Red:** viết test trước, chạy thấy đỏ vì chưa có `src/leave/*`.
2. **Green:** viết `src/leave/*` cho tới khi 51 + 4 test xanh. Không sửa dòng test nào.
   Do commit `9a5ac3b` gộp test + code + docs, Git không thể hiện thứ tự Red → Green. Minh chứng thứ tự theo hành vi xem mục 7.
3. **Refactor:** tách component và hàm thuần, test vẫn xanh.

App demo: `npm run dev` → `http://127.0.0.1:4317/schedule?date=2026-10-12` (cổng cố định trong `vite.config.ts`, Playwright dùng cùng địa chỉ), dùng API giả trong bộ nhớ. Chi tiết và cách chạy: `parallel-tests/README.md`.

## 6. Ba AI workflow đã dùng và cách tự xác minh

Phân biệt hai loại xác minh:
- **AI tự xác nhận:** AI trả lời "đúng rồi", "test sẽ pass". Chỉ là ý kiến, không tính là bằng chứng.
- **Kiểm chứng độc lập:** chạy test và đọc output, đối chiếu nguồn chính thức (docs Vitest/Playwright/Testing Library, sách Kent Beck), mutation check.

> Các ô "Trích đoạn" là chỗ dán 1–2 câu chat thật (không cần dán cả hội thoại). Phần log/test đã có thật trong repo.

### 6.1. Layered Questioning: research → brief → ví dụ → validation

| Lớp | Câu hỏi cho AI | Kết quả dùng trong bài | Kiểm chứng độc lập |
|---|---|---|---|
| Research | "TDD là gì, Red-Green-Refactor gồm những pha nào, testing pyramid chia tầng thế nào?" | Mục 1, 2 | Đối chiếu Martin Fowler (TDD, Test Pyramid), Kent Beck *TDD by Example* |
| Brief | "Tóm tắt thành bảng: mỗi pha làm gì, dấu hiệu xong" | Bảng pha ở mục 1 | Tự kiểm: bảng có khớp 3 luật của Beck không |
| Ví dụ | "Cho ví dụ test CLI có file storage, exit code, stderr" | Ví dụ `todo` và bảng Ticket Manager ở mục 4 | Đọc lại từng assertion: có kiểm stderr tách khỏi stdout, file không bị ghi đè không |
| Validation | "Làm sao biết bộ test này đủ chặt?" | Mutation check (mục 3, 7) | **Chạy thật**: đổi `> 0` thành `>= 0` → test đỏ ([evidence/4-mutation.log](evidence/4-mutation.log)) |

Trích đoạn:https://drive.google.com/file/d/1Bu2nqIYWyZsZr5NvMoGHfZUDs7EzWYTJ/view?usp=sharing
### 6.2. Solution Exploration: so sánh ít nhất hai lựa chọn

| Quyết định | Lựa chọn A | Lựa chọn B | Trade-off | Chọn & lý do |
|---|---|---|---|---|
| Test runner unit/integration | **Vitest** | Jest | Jest phổ biến, nhiều tài liệu nhưng cần cấu hình thêm (Babel/ts-jest) cho TS + ESM. Vitest dùng chung config/transform với Vite, API gần như giống Jest | **Vitest**: dự án đã dùng Vite, ít cấu hình, chạy nhanh |
| E2E | **Playwright** | Cypress | Cypress debug trực quan nhưng chạy song song cần trả phí/cấu hình. Playwright có `page.route` chặn API, chạy song song sẵn | **Playwright**: cần chặn mọi `/api/**` và chạy song song để soi flaky (5 lần × 4 luồng) |
| Tầng kiểm luật "1 người dự phòng/ngày" | Kiểm qua UI (integration/E2E) | Kiểm hàm thuần `assignStandby` (unit) | UI test sát người dùng nhưng chậm, khi đỏ khó biết sai ở đâu | **Unit** cho luật + 1 integration kiểm UI hiển thị câu lỗi |

Trích đoạn: _[dán đoạn AI đề xuất các lựa chọn]_

### 6.3. Iterative Refinement: AI đề xuất → phản biện → sửa → tự kiểm

| Vòng | AI đề xuất | Phản biện | Sửa thành | Tự kiểm bằng |
|---|---|---|---|---|
| 1 | Coi lần chạy đầu "Failed to resolve import" là pha Red | Đó là lỗi thiếu module, không phải test đo hành vi chưa có | Thêm stub đúng chữ ký, test đỏ do expected ≠ actual | [evidence/1-red-b.log](evidence/1-red-b.log): Expected `missingPeople: 2` / Received `0` |
| 2 | Assertion lỏng kiểu `toBeGreaterThan(0)` / regex lỗi | Code sai vẫn xanh | `toEqual` toàn object, câu lỗi đúng từng chữ, schema `zod` cho payload | Mutation: bỏ luật dự phòng → 1 test đỏ, đổi đầu tuần → 11 test đỏ |
| 3 | Chờ UI bằng `waitForTimeout` | Gây flaky, phụ thuộc tốc độ máy | `findBy*`, `expect(locator).toBeVisible()`, `retries: 0` | 5 lần × 4 luồng: 20/20 xanh |
| 4 | Playwright `reuseExistingServer: true` ở cổng 3000 | Reviewer gặp: cổng 3000 có web khác → test mở nhầm site, 4 test timeout | Cổng cố định `127.0.0.1:4317` + `strictPort` + URL health riêng của demo | Chạy thử với một server lạ chiếm cổng 4317 → Playwright báo `Port 4317 is already in use`, không test nhầm |

Trích đoạn: _[dán 1–2 câu phản biện thật của bạn với AI]_

## 7. Minh chứng một vòng Red → Green → Refactor theo hành vi

Hành vi `summarizeCoverage(rows)` (tổng hợp thiếu người trong tuần), chi tiết và log tại [evidence/tdd-cycle-summarizeCoverage.md](evidence/tdd-cycle-summarizeCoverage.md):

1. **Red (đúng lý do):** test viết trước; stub trả 0 → `AssertionError`, Expected `{ missingPeople: 2, uncoveredHalfDays: 2 }`, Received `{ 0, 0 }`.
2. **Green:** cài đặt tối thiểu bằng vòng `for` → 2/2 pass.
3. **Refactor:** đổi sang `filter` + `reduce` → toàn bộ 53/53 test Vitest vẫn pass.
4. **Mutation:** đổi `> 0` thành `>= 0` → test đỏ (Received `uncoveredHalfDays: 3`).

Mentor có thể tự chạy lại: `npm run test:unit -- coverageSummary`.

## Nguồn tham khảo

- Kent Beck, *Test-Driven Development: By Example* (Addison-Wesley, 2002).
- Martin Fowler, [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html) và [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html).
- Testing Library, [Guiding Principles](https://testing-library.com/docs/guiding-principles).
- Playwright, [Best Practices](https://playwright.dev/docs/best-practices) và [webServer](https://playwright.dev/docs/test-webserver).
- Vitest, [Comparisons with Other Test Runners](https://vitest.dev/guide/comparisons).
