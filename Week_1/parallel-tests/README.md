# /parallel-tests – Leave & Standby Modal (TDD)

Bộ test này được **viết trước code**.

- **Red:** khi chưa có `src/`, test đỏ vì thiếu module (`Failed to resolve import "../../src/leave/leaveLogic"`).
- **Green:** `src/leave/` đã viết xong. Kết quả 51/51 test Vitest và 4/4 test Playwright xanh.
- **Refactor:** tách thành `leaveLogic` (hàm thuần), `LeaveGrid`, `AssigneeChangesTable`, `labels` và `LeaveModal`. Test vẫn xanh, không phải sửa test.

## Chạy

```bash
npm install
npm test                 # unit + integration (Vitest, jsdom)
npm run test:unit
npm run test:integration
npm run test:e2e         # Playwright: tự bật app demo (Vite, cổng 4317)
npm run dev              # xem tay: http://localhost:4317/schedule?date=2026-10-12
```

Muốn chạy E2E trên một app khác thì đặt `BASE_URL`. Trên PowerShell: `$env:BASE_URL="http://localhost:5173"; npm run test:e2e`.

Lần đầu chạy E2E: `npx playwright install chromium`.

## Kim tự tháp test

| Tầng | File | Kiểm cái gì | Số test |
|---|---|---|---|
| Unit | `unit/leaveLogic.test.ts` | Hàm thuần: tuần BV T6 → T5, bật/tắt nghỉ, tối đa 1 người dự phòng/ngày, sinh bảng "Procedure assignee changes" | 32 |
| Integration | `integration/LeaveModal.test.tsx` | `<LeaveModal />` + React Testing Library: tải dữ liệu (API bị mock), lưới 7 ngày × sáng/chiều, click ô, chọn dự phòng, bảng cập nhật, Save | 19 |
| E2E | `e2e/leave-standby-flow.spec.ts` | Hành trình người dùng trên trình duyệt; chặn mọi request `/api/**`, kiểm payload Save bằng schema `zod` | 4 |

## Code đáp ứng hợp đồng (`src/leave/`)

- `src/leave/leaveLogic.ts`: `getHospitalWeek`, `toggleLeave`, `assignStandby`, `clearStandby`, `buildAssigneeChanges`.
- `src/leave/leaveApi.ts`: `fetchLeaveWeek(departmentId, weekStart)`, `saveLeaveWeek(payload)` gọi `GET`/`PUT /api/leave-week`.
- `src/leave/LeaveModal.tsx`: `LeaveModal({ departmentId, departmentName, date, open, onClose })`.
- Tên truy cập (accessible names) và câu lỗi chính xác ghi ở đầu mỗi file test. Test tìm phần tử theo role và tên, không theo CSS class.

## Luật chống "flaky" đã áp dụng

- Không có `setTimeout`, `sleep`, `waitForTimeout`: chỉ dùng `findBy*`, `waitFor`, `expect(locator).toBeVisible()` / `toHaveAttribute()`.
- Không gọi endpoint thật: Vitest dùng `vi.mock('../../src/leave/leaveApi')`. Playwright dùng `page.route('**/api/**')`, request lạ bị ghi lại và test fail.
- Dữ liệu cố định trong `fixtures/leave-week.ts`, ngày cố định qua `?date=2026-10-12`, không phụ thuộc đồng hồ hay múi giờ máy.
- Lỗi phải đúng từng chữ: `Only one standby person is allowed per day: 2026-10-13 already has s-ky`, `Could not load leave data. Please try again.`, `Could not save. Your changes are kept – please try again.`
- `retries: 0` trong Playwright: test flaky phải được sửa, không chạy lại cho qua.
