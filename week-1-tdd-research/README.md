# Tuần 1 — TDD với quy trình AI có kiểm soát

Đề bài: `MindXOnboarding/docs/plans/week-1/overview.md` · Slide: `slides-ai-training.md`
Nguồn: chuyển từ `Week_1/` của cấu trúc cũ. Các commit gốc (`9a5ac3b`, `28f7f4f`, `06a2a41` — 12 và 16/10/2026, được nhắc trong TDD-Research.md §5) nằm ở branch `archive/old-main`.

| Tài liệu | Nội dung |
|---|---|
| [TDD-Research.md](TDD-Research.md) | Bài nghiên cứu chính: Red → Green → Refactor, testing pyramid, kiểm soát code AI, 4 lỗi testing thường gặp, test CLI (Ticket Manager), 3 AI workflow |
| [LectureHomeworkResearch.pdf](LectureHomeworkResearch.pdf) | Bản PDF nộp bài kèm minh chứng |
| [evidence/tdd-cycle-summarizeCoverage.md](evidence/tdd-cycle-summarizeCoverage.md) | Log thật một vòng TDD theo hành vi (Red do expected ≠ actual → Green → Refactor → mutation) |
| [parallel-tests/README.md](parallel-tests/README.md) | Bộ test thực hành "Leave & Standby Modal": 34 unit · 19 integration · 4 E2E |
| [ai-workflow-log.md](ai-workflow-log.md) | Link hội thoại AI (Google Drive) làm bằng chứng cho mục 6 |

## Chạy test

Yêu cầu Node.js 20+, dùng **npm** (`package-lock.json`).

```bash
cd week-1-tdd-research
npm ci
npm test                          # unit + integration (Vitest)
npx playwright install chromium   # chỉ lần đầu
npm run test:e2e                  # E2E (Playwright), tự bật demo tại http://127.0.0.1:4317
npm run dev                       # xem tay: http://127.0.0.1:4317/schedule?date=2026-10-12
```

## Đối chiếu yêu cầu đề bài

| Yêu cầu | Trạng thái | Ở đâu |
|---|---|---|
| Nguyên lý TDD, Red–Green–Refactor | ✅ | TDD-Research.md §1 |
| So sánh unit / integration / E2E | ✅ | §2 |
| Ví dụ test cho Ticket Manager CLI | ✅ | §4, §4.1 (6 test case) |
| Test giúp kiểm soát code AI | ✅ | §3 (mutation check, guardrails) |
| Lỗi testing thường gặp | ✅ | §3b |
| Bằng chứng Layered Questioning | ✅ | §6.1 + hội thoại trên Drive |
| Bằng chứng Solution Exploration | ✅ | §6.2 + hội thoại trên Drive |
| Bằng chứng Iterative Refinement | ✅ | §6.3 + hội thoại trên Drive |
| Một vòng TDD có log thật | ✅ | §7 + `evidence/` |
