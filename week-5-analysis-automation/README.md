# Tuần 5 — Reporting, Analysis & Automation

Đề bài: `MindXOnboarding/docs/plans/week-5/` · Dữ liệu mẫu: `week-5/data/sample.xlsx`

| Thư mục | Nội dung |
|---|---|
| `reports/` | Screenshot/export báo cáo Odoo |
| `analysis/` | Phân tích pattern, top 5 issue, action plan |
| `automation/` | Script automation Login Issue (Python) + tài liệu |
| `presentation/` | Slide thuyết trình cuối tuần |

⚠️ `sample.xlsx` chứa tên người thật — không commit bản copy thô; chỉ dùng số liệu tổng hợp hoặc dữ liệu đã ẩn danh.

## Ngày 1–2: Reporting & Analysis
- [ ] Báo cáo: tóm tắt ticket hằng ngày, hiệu suất team, theo category, xu hướng volume
- [ ] Top 5 vấn đề lặp lại + tác động (số user, thời gian xử lý) + bằng chứng
- [ ] Đề xuất có dữ liệu chứng minh

## Ngày 3–4: Automation — Login Issue
- [ ] Ticket Analysis: nhận diện login issue (keyword/NLP)
- [ ] HR Check: gọi API HR lấy trạng thái nhân sự
- [ ] Decision: đang làm → reactivate LMS; đã nghỉ → thêm note cho review tay
- [ ] Auto-Response: gửi email cho user
- [ ] Logging mọi hành động & quyết định; error handling + fallback
- [ ] Tích hợp Odoo (webhook khi tạo ticket hoặc check định kỳ)
- [ ] Test end-to-end
- [ ] Tài liệu: workflow, setup webhook/API, vì sao automation thay vì sửa code, bài KB

## Thuyết trình
- [ ] Giải pháp automation, mindset Operating Engineer, metric trước/sau, khi nào automation vs code fix

## Acceptance criteria
- [ ] Xác định pattern ticket lặp lại
- [ ] Phát hiện + đề xuất có dữ liệu
- [ ] Automation cho Scenario 1 hoạt động (phân tích ticket, check HR, xử lý tương ứng)
- [ ] Tích hợp Odoo webhook/API
- [ ] Action plan giảm volume ticket

**Cần Sys Admin/DevOps:** quyền reporting Odoo, môi trường chạy script.
