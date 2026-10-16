/**
 * UNIT – summarizeCoverage(rows): tóm tắt bảng "Procedure assignee changes" để modal hiện cảnh báo thiếu người.
 * Viết TRƯỚC code theo chu trình Red → Green → Refactor (log: Week_1/evidence/tdd-cycle-summarizeCoverage.md).
 */
import { describe, expect, it } from 'vitest';

import { type AssigneeChangeRow, summarizeCoverage } from '../../src/leave/leaveLogic';

const row = (over: Partial<AssigneeChangeRow>): AssigneeChangeRow => ({
  date: '2026-10-12',
  half: 'MORNING',
  absent: ['Dao'],
  coveredBy: null,
  missing: 1,
  ...over,
});

describe('summarizeCoverage – tổng hợp thiếu người trong tuần', () => {
  it('tuần không ai nghỉ → mọi chỉ số bằng 0', () => {
    expect(summarizeCoverage([])).toEqual({ halfDaysWithLeave: 0, uncoveredHalfDays: 0, missingPeople: 0 });
  });

  it('cộng dồn số người còn thiếu và đếm buổi chưa được bù đủ', () => {
    const rows = [
      row({ half: 'MORNING', absent: ['Dao'], coveredBy: 'Ky', missing: 0 }), // dự phòng bù đủ
      row({ half: 'AFTERNOON', absent: ['Dao', 'Tho'], coveredBy: 'Ky', missing: 1 }), // bù 1, thiếu 1
      row({ date: '2026-10-13', absent: ['Hung'], coveredBy: null, missing: 1 }), // không có dự phòng
    ];
    expect(summarizeCoverage(rows)).toEqual({ halfDaysWithLeave: 3, uncoveredHalfDays: 2, missingPeople: 2 });
  });
});
