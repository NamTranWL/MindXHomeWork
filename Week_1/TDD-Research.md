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

Nguyên tắc chia: luật nghiệp vụ càng nhiều nhánh thì càng nên nằm ở **unit** (nhanh, chỉ đúng chỗ sai). Integration kiểm việc "nối dây". E2E chỉ giữ vài luồng quan trọng nhất vì chậm và dễ chập chờn. Trong bài: **32 unit · 19 integration · 4 E2E**.

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
- Chạy `npm test` trên thư mục chưa có `src/` → 2 file đỏ vì `Failed to resolve import "../../src/leave/leaveLogic"` (đúng pha Red).
- Viết một bản cài đặt tham chiếu tạm (không nộp) → **51/51** test Vitest và **4/4** test Playwright xanh, chạy lặp 5 lần × 4 luồng song song vẫn **20/20** xanh (không flaky). Vậy bộ test là khả thi, không đòi điều mâu thuẫn.
- Mutation:
  - Bỏ luật "1 người dự phòng/ngày" → **1** test đỏ.
  - Đổi đầu tuần từ Thứ 6 sang Thứ 2 → **11** test đỏ.

  Test bắt được lỗi thật.

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

## 5. Bài thực hành: Leave & Standby Modal

Viết **chỉ test** (pha Red) cho tính năng: bấm "Geriatrics Department" trên màn Scheduling mở modal gồm:
- lưới nghỉ một tuần BV (T6 → T5), mỗi ngày chia sáng/chiều, bấm ô để bật/tắt nghỉ;
- mỗi ngày đúng 1 người dự phòng;
- bảng "Procedure assignee changes" tự sinh.

Tiến trình:

1. **Red:** viết test trước, chạy thấy đỏ vì chưa có `src/leave/*`.
2. **Green:** viết `src/leave/*` cho tới khi 51 + 4 test xanh. Không sửa dòng test nào.
3. **Refactor:** tách component và hàm thuần, test vẫn xanh.

App demo: `npm run dev` → `http://localhost:4317/schedule?date=2026-10-12`, dùng API giả trong bộ nhớ. Chi tiết và cách chạy: `parallel-tests/README.md`.

## Nguồn tham khảo

- Kent Beck, *Test-Driven Development: By Example* (Addison-Wesley, 2002).
- Martin Fowler, [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html) và [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html).
- Testing Library, [Guiding Principles](https://testing-library.com/docs/guiding-principles).
- Playwright, [Best Practices](https://playwright.dev/docs/best-practices).
