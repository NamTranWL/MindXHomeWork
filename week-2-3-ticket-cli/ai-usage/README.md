# Dùng AI trong tuần 2 — Ticket Manager CLI

Tuần 2 áp dụng 3 workflow của bài AI Training (`slides-ai-training.md`) theo thứ tự: hiểu bài bằng **Layered Questioning**, chốt thiết kế bằng **Solution Exploration**, rồi thực hiện các vòng TDD. Mọi quyết định về hành vi và thiết kế do mình chốt; AI đề xuất, phản biện, đề xuất code Green ở T1 và (từ T2) thực thi vòng TDD theo luật mình đặt.

| Giai đoạn | Workflow | Ai làm | Kết quả | Chi tiết |
|---|---|---|---|---|
| 1. Hiểu bài, viết spec | Layered Questioning (LQ-1 → LQ-4) | Mình hỏi, AI trả lời và chỉ ra rủi ro; **mình chốt** | `docs/SPEC.md` (T1–T64) | [01-layered-questioning.md](01-layered-questioning.md) |
| 2. Chọn công cụ, thiết kế | Solution Exploration (SE-1 → SE-5) | Mình đưa context, AI liệt kê phương án; **mình chọn** | `docs/DECISIONS.md` (21 quyết định) | [02-solution-exploration.md](02-solution-exploration.md) |
| 3. Thực hiện TDD | Red → Green → Refactor | **T1:** mình viết test và chạy từng bước, AI đề xuất code Green, mình review rồi commit. **T2–T64:** AI agent thực hiện cùng vòng lặp | `src/`, `tests/`, `evidence/` | [03-tdd-execution.md](03-tdd-execution.md) |
| 4. Kiểm chứng | Verify độc lập | Mình | Chạy lại test, typecheck, CLI thật; script kiểm chứng Commander | [03-tdd-execution.md](03-tdd-execution.md#3-kiểm-chứng-sau-khi-agent-chạy), [verify-commander.cjs](verify-commander.cjs) |

## Nguyên tắc kiểm soát AI đã áp dụng

1. **Spec trước, code sau.** AI không viết code trong giai đoạn 1–2; mọi điểm mập mờ AI nêu ra đều được mình chốt thành một dòng Tn trong `SPEC.md` trước khi vào vòng TDD.
2. **Khẳng định của AI phải được kiểm chứng độc lập.** Ví dụ: AI tự nói "mình nhớ exit code là 1, nhưng chưa kiểm chứng" về Commander, nên có [verify-commander.cjs](verify-commander.cjs) chạy trên đúng phiên bản 14.0.3.
3. **Test là hợp đồng.** Commit `feat` (green) và `refactor` không được sửa file test — kiểm tra được bằng lệnh ở [03-tdd-execution.md](03-tdd-execution.md#3-kiểm-chứng-sau-khi-agent-chạy).
4. **Minh bạch phần AI làm.** Lịch sử commit cho thấy rõ ranh giới: T1 mình dẫn dắt và commit (múi giờ `+0700`), T2–T64 do agent chạy trong môi trường Linux (múi giờ `+0000`).
