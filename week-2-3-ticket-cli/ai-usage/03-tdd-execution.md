# Thực hiện TDD — T1 mình dẫn dắt, T2–T64 do AI agent

**Tóm tắt:** ở vòng TDD đầu tiên (T1), mình viết test và chạy từng bước; AI đề xuất code cho pha Green, mình review rồi commit. Vòng này dùng để chốt cách làm: test đỏ, code tối thiểu, review, log bằng chứng. Các hành vi còn lại (T2–T64) giao cho AI agent thực hiện **đúng vòng lặp đó**, mỗi hành vi một cặp commit `test (red)` → `feat (green)`, có `refactor` khi cần. Sau đó mình kiểm chứng độc lập toàn bộ kết quả.

| Phần | Ai làm | Thời gian (giờ VN, 01/11/2026) | Commit |
|---|---|---|---|
| Spec T1–T64 | Mình (sau Layered Questioning) | 12:47 | `docs(week-2): define ticket CLI spec and test list` |
| Quyết định thiết kế + dựng khung + test T1 | Mình (sau Solution Exploration) | 13:11 | `docs(week-2): record design decisions and update spec` |
| T1 green + log đỏ | AI đề xuất code Green; mình review và commit | 13:15–13:17 | `feat(week-2): T1 ...`, `docs(week-2): add T1 red evidence log` |
| T2–T64, refactor, tài liệu | AI agent | 13:27–13:46 | 98 commit |

Ranh giới nhìn thấy được ngay trong `git log`: commit của mình mang múi giờ `+0700`; commit của agent mang `+0000` vì agent chạy trong môi trường Linux đặt giờ UTC.

## 1. Vòng T1 — mình viết test, AI đề xuất Green, mình review

**Hành vi:** thiếu title → `ValidationError`, message `--title is required`.

1. **Red.** Viết test trước (`tests/unit/models/ticket.test.ts`), assert cả lớp lỗi lẫn message chính xác (theo bài học LQ-4: `toThrow()` trơn sẽ xanh giả):
   ```ts
   it('T1: thiếu title → ValidationError "--title is required"', () => {
     const act = () => parseNewTicket({});
     expect(act).toThrow(ValidationError);
     expect(act).toThrow(/^--title is required$/);
   });
   ```
   Chạy `npx jest` → đỏ (`evidence/T1-red.log`).
2. **Green — AI đề xuất, mình review.** Mình đưa test đang đỏ cho AI và yêu cầu code tối thiểu để sang pha Green. Code AI đề xuất:
   ```ts
   export function parseNewTicket(_input: NewTicketInput) {
     throw new ValidationError('--title is required');
   }
   ```
   Khi review, mình đối chiếu trước khi commit:
   - **Tối thiểu (Fake It)**, đúng kỹ thuật học ở LQ-3: chưa có test nào đòi trường hợp hợp lệ nên chỉ cần ném lỗi. Các test sau (T2 title toàn khoảng trắng, T3 trim, T4 status mặc định…) sẽ buộc hàm tổng quát hoá.
   - **Đúng lớp:** nằm trong `src/models/ticket.ts`, không đọc/ghi file, không in ra màn hình.
   - **Đúng quyết định thiết kế:** dùng `ValidationError` (exit 2), message không có tiền tố `Error: ` (DECISIONS #7, #8).
   - **Không đụng file test**, chạy lại `npx jest` → xanh.

   _<Nếu khi review mình có sửa gì so với bản AI đề xuất, ghi thêm ở đây.>_
3. **Commit** pha Green, rồi commit log đỏ làm bằng chứng.

**Hạn chế mình tự nhận:** test T1 nằm chung commit với phần dựng khung project thay vì có commit `test(...)` riêng, và lần đỏ là "thiếu module" (`Cannot find module`), chưa phải đỏ do assertion. Log được tái tạo bằng cách chạy lại test trên đúng cây file của commit đó. Lịch sử giữ nguyên, không viết lại.

## 2. T2–T64 — AI agent thực hiện cùng vòng lặp

**Prompt giao việc cho agent:** _<dán prompt thật đã dùng>_

Luật vòng lặp (thể hiện và kiểm tra được trong lịch sử commit):

1. Làm lần lượt từng hành vi theo thứ tự trong `SPEC.md` (model → service → storage → command).
2. Mỗi hành vi: viết test → chạy → lưu output đỏ vào `evidence/Tn-red.log` → commit `test(week-2): Tn ... (red)`.
3. Viết code tối thiểu trong `src/` → toàn bộ test xanh → commit `feat(week-2): Tn ... (green)`. **Không sửa file test.**
4. Có chỗ đáng dọn thì `refactor(week-2): ...`, test vẫn xanh, không sửa test.
5. Test viết xong mà xanh ngay (hành vi đã được code trước đó đáp ứng) thì ghi trung thực `(passes immediately)`, không giả vờ đỏ.

| Loại commit của agent | Số lượng |
|---|---|
| `test ... (red)` | 38 |
| `feat ... (green)` | 38 |
| `test ... (passes immediately)` | 11 |
| `refactor` | 4 |
| `chore` / `docs` | 3 / 4 |
| **Tổng** | **98** |

Một số commit đỏ gom nhiều hành vi cùng lệnh (ví dụ `create` T41–T48), nên số cặp ít hơn số Tn.

## 3. Phần mình review (Iterative Refinement)

_<Điền những gì mình thật sự đã review/sửa sau khi agent chạy. Nếu chưa review vòng nào thì ghi rõ "chưa", đừng điền cho đủ.>_

| Vòng / file | Agent làm | Mình thấy vấn đề gì | Đã sửa / quyết định | Kiểm lại bằng |
|---|---|---|---|---|
| | | | | |

## 4. Kiểm chứng sau khi agent chạy

Không dựa vào việc agent "nói là xong". Các kiểm tra dưới đây chạy lại được; kết quả ghi ngày 02/11/2026.

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Toàn bộ test trên bản sạch | `npm ci; npm test` | 8 suite, **77/77 xanh**, ~4,5 s |
| Kiểu dữ liệu | `npm run typecheck` | Không lỗi |
| Build | `npm run build` | Ra `dist/` |
| Commit `feat`/`refactor` không sửa test | xem bên dưới | Không có commit nào |
| Lý do đỏ trong `evidence/` | đọc 39 log | 30 log đỏ do assertion (expected ≠ received); 9 log đỏ do thiếu module/hàm ở vòng đầu của module mới (T1, T10, T12, T13, T16, T25, T27, T32, nhóm create) |
| CLI thật, đúng như README | `node dist/cli.js ...` với `TICKETS_FILE` tạm | 4 lệnh đúng; thiếu/sai input → exit 2; `show 99` → exit 1; file hỏng → exit 1 và **không bị ghi đè**; file 0 byte → rỗng |
| Khẳng định của AI về Commander | `node ai-usage/verify-commander.cjs` | Đúng cả 4 (xem [01](01-layered-questioning.md)) |

Kiểm tra "commit green/refactor không đụng test" (PowerShell, chạy ở gốc repo, không in gì nghĩa là đạt):

```powershell
git log --format=%h --grep="^feat(week-2)" --grep="^refactor(week-2)" |
  ForEach-Object { git show --name-only --format= $_ } |
  Select-String "week-2-3-ticket-cli/tests/"
```

## 5. Nhìn lại

_<Tự viết 3–5 dòng: vì sao giao T2–T64 cho agent; việc dẫn dắt T1 từng bước (test, chạy, review code AI) giúp gì khi đặt luật cho agent; nếu làm lại thì kiểm soát agent thế nào (ví dụ review sau mỗi lớp model/service/storage/command thay vì cuối cùng).>_
