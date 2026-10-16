# Minh chứng một vòng TDD theo hành vi: `summarizeCoverage`

Hành vi mới: từ bảng "Procedure assignee changes", tính **số buổi có người nghỉ**, **số buổi chưa được bù đủ** và **tổng số người còn thiếu** trong tuần (dùng để modal hiện cảnh báo).

Mọi log trong thư mục này là output thật của Vitest 2.1.8 (đã bỏ mã màu ANSI, thay đường dẫn máy bằng `<Week_1>`).

| Bước | Làm gì | Kết quả | Log |
|---|---|---|---|
| 0. Viết test trước | `parallel-tests/unit/coverageSummary.test.ts`: 2 case (tuần trống; 3 dòng gồm bù đủ / bù thiếu / không có dự phòng) | – | – |
| 1a. Red (chưa có hàm) | Chạy test khi `summarizeCoverage` chưa tồn tại | 2 fail: `TypeError: summarizeCoverage is not a function`. Đây mới là lỗi "thiếu API", **chưa** phải lỗi hành vi | [1-red-a.log](1-red-a.log) |
| 1b. Red (đúng lý do) | Thêm stub có chữ ký đúng nhưng trả `uncoveredHalfDays: 0, missingPeople: 0` | 1 fail **do assertion**: Expected `missingPeople: 2, uncoveredHalfDays: 2` ↔ Received `0, 0`. Case tuần trống pass (đúng, vì stub trả 0) | [1-red-b.log](1-red-b.log) |
| 2. Green | Cài đặt tối thiểu bằng vòng `for` | 2/2 pass | [2-green.log](2-green.log) |
| 3. Refactor | Thay vòng `for` bằng `filter` + `reduce`, không đổi hành vi; chạy **toàn bộ** suite | 53/53 pass (32 + 2 unit, 19 integration) | [3-refactor.log](3-refactor.log), [refactor.diff](refactor.diff) |
| 4. Mutation check | Cố ý đổi `row.missing > 0` thành `>= 0` | Test đỏ: Expected `uncoveredHalfDays: 2` ↔ Received `3` → test đủ chặt; đã hoàn tác | [4-mutation.log](4-mutation.log) |

**Vì sao cần bước 1b:** lần Red ban đầu của cả bộ test (khi chưa có `src/`) chỉ là lỗi import module. Lỗi đó chứng minh code chưa tồn tại, nhưng không chứng minh test kiểm đúng hành vi. Stub có chữ ký đúng mà kết quả sai làm test đỏ bởi **expected ≠ actual**, tức test thực sự đo hành vi.

Tự chạy lại: `npm run test:unit -- coverageSummary`.
