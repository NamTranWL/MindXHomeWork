# MindX Onboarding — Bài làm

Repo chứa toàn bộ bài làm của khoá MindX Engineer Onboarding (5 tuần).
Tài liệu đề bài nằm ở repo riêng: `../MindXOnboarding/docs/plans/`.

| Thư mục | Tuần | Nội dung |
|---|---|---|
| `week-1-tdd-research/` | 1 | Nghiên cứu TDD theo 3 workflow AI |
| `week-2-3-ticket-cli/` | 2–3 | Ticket Manager CLI (TDD) + tích hợp KB API |
| `week-4-scenarios/` | 4 | 6 scenario xử lý ticket trên Odoo + email draft |
| `week-5-analysis-automation/` | 5 | Báo cáo Odoo, phân tích pattern, automation Login Issue |
| `cv/` | — | CV (bài tập CV & Interview Tips, đã review với mentor) |
| `notes/` | — | Ghi chú cá nhân, Lifetime Learning |

## Quy ước
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/), có scope theo tuần: `docs(week-1): ...`, `test(week-2): add ticket CLI cases`, `feat(week-2): implement tickets create`.
- Với code, commit theo nhịp TDD (`test` → `feat` → `refactor`) để mentor thấy Red-Green-Refactor trong lịch sử git.
- Mỗi tuần xong thì tạo tag: `git tag week-1-done`, `week-2-done`...
- **Không commit** dữ liệu thật có thông tin cá nhân (PII), file `.env`, API key. Screenshot phải che thông tin nhạy cảm.

## Tiến độ
- [x] Tuần 1 — TDD research
- [x] Tuần 2 — Ticket Manager CLI
- [ ] Tuần 3 — KB API integration
- [ ] Tuần 4 — 6 scenario
- [ ] Tuần 5 — Analysis & automation
- [x] CV — đã sửa theo review mentor
- [ ] Lifetime Learning

## Lịch sử
Repo này thay thế cấu trúc cũ (`Week_1/`, `Week_2/`) từ 31/10/2026. Lịch sử commit cũ được giữ ở branch `archive/old-main` (tip `3b4251f`).
