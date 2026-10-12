/**
 * UNIT – pure business rules of the "Leave & Standby" feature (TDD Red phase).
 *
 * Contract the implementation must provide in `src/leave/leaveLogic.ts`:
 *   getHospitalWeek(date)                     -> { start, end, days }   (Fri -> Thu, 7 ISO dates)
 *   toggleLeave(leaves, entry)                -> LeaveEntry[]           (immutable add/remove)
 *   assignStandby(standby, date, staffId)     -> StandbyEntry[]         (max ONE person per day)
 *   clearStandby(standby, date)               -> StandbyEntry[]
 *   buildAssigneeChanges(week)                -> AssigneeChangeRow[]    ("Procedure assignee changes")
 *
 * Every function here is pure: no React, no network, no clock.
 */
import { describe, expect, it } from 'vitest';

import {
  assignStandby,
  buildAssigneeChanges,
  clearStandby,
  getHospitalWeek,
  toggleLeave,
} from '../../src/leave/leaveLogic';
import { initialLeaveWeek, type LeaveEntry, type StandbyEntry } from '../fixtures/leave-week';

describe('getHospitalWeek – Friday -> Thursday range', () => {
  const EXPECTED = {
    start: '2026-10-09',
    end: '2026-10-15',
    days: ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'],
  };

  it.each([
    ['Friday (first day of the week)', '2026-10-09'],
    ['Saturday', '2026-10-10'],
    ['Sunday', '2026-10-11'],
    ['Monday', '2026-10-12'],
    ['Wednesday', '2026-10-14'],
    ['Thursday (last day of the week)', '2026-10-15'],
  ])('%s %s belongs to the week Fri 2026-10-09 -> Thu 2026-10-15', (_label, date) => {
    expect(getHospitalWeek(date)).toEqual(EXPECTED);
  });

  it('the next Friday starts a new week', () => {
    expect(getHospitalWeek('2026-10-16').start).toBe('2026-10-16');
    expect(getHospitalWeek('2026-10-16').end).toBe('2026-10-22');
  });

  it('always returns exactly 7 consecutive days', () => {
    const { days } = getHospitalWeek('2026-10-13');
    expect(days).toHaveLength(7);
    const gaps = days.slice(1).map((day, index) => Date.parse(day) - Date.parse(days[index] as string));
    expect(new Set(gaps)).toEqual(new Set([86_400_000]));
  });

  it('crosses month and year boundaries correctly', () => {
    expect(getHospitalWeek('2026-11-02')).toMatchObject({ start: '2026-10-30', end: '2026-11-05' });
    expect(getHospitalWeek('2027-01-01')).toMatchObject({ start: '2027-01-01', end: '2027-01-07' });
    expect(getHospitalWeek('2026-12-31')).toMatchObject({ start: '2026-12-25', end: '2026-12-31' });
  });

  it('handles leap day 2028-02-29', () => {
    expect(getHospitalWeek('2028-02-29')).toMatchObject({ start: '2028-02-25', end: '2028-03-02' });
  });

  it('does not depend on the machine time zone (input/output are plain YYYY-MM-DD strings)', () => {
    const result = getHospitalWeek('2026-10-12');
    for (const day of result.days) {
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it.each(['', 'not-a-date', '2026-13-01', '2026-02-30'])('rejects invalid input %j with an exact message', (bad) => {
    expect(() => getHospitalWeek(bad)).toThrowError(`Invalid date: "${bad}" (expected YYYY-MM-DD)`);
  });
});

describe('toggleLeave – clicking a half-day cell', () => {
  const base: LeaveEntry[] = [{ staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' }];

  it('adds leave for a half-day that had none', () => {
    const next = toggleLeave(base, { staffId: 's-tho', date: '2026-10-12', half: 'MORNING' });
    expect(next).toContainEqual({ staffId: 's-tho', date: '2026-10-12', half: 'MORNING' });
    expect(next).toHaveLength(2);
  });

  it('removes leave when the same half-day is clicked again', () => {
    const next = toggleLeave(base, { staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' });
    expect(next).toEqual([]);
  });

  it('morning and afternoon of the same day are independent', () => {
    const next = toggleLeave(base, { staffId: 's-dao', date: '2026-10-13', half: 'MORNING' });
    expect(next).toHaveLength(2);
  });

  it('never mutates the input array (React state must stay immutable)', () => {
    const frozen = Object.freeze([...base]) as LeaveEntry[];
    expect(() => toggleLeave(frozen, { staffId: 's-ky', date: '2026-10-14', half: 'MORNING' })).not.toThrow();
    expect(frozen).toHaveLength(1);
  });
});

describe('assignStandby – exactly ONE standby person per day', () => {
  const empty: StandbyEntry[] = [];

  it('assigns a standby person to a day', () => {
    expect(assignStandby(empty, '2026-10-13', 's-ky')).toEqual([{ date: '2026-10-13', staffId: 's-ky' }]);
  });

  it('assigning the same person again is idempotent (no duplicate rows)', () => {
    const once = assignStandby(empty, '2026-10-13', 's-ky');
    expect(assignStandby(once, '2026-10-13', 's-ky')).toEqual(once);
  });

  it('throws the exact error when a SECOND person is assigned to the same day', () => {
    const once = assignStandby(empty, '2026-10-13', 's-ky');
    expect(() => assignStandby(once, '2026-10-13', 's-hung')).toThrowError(
      'Only one standby person is allowed per day: 2026-10-13 already has s-ky',
    );
  });

  it('the failed assignment leaves the original state untouched', () => {
    const once = assignStandby(empty, '2026-10-13', 's-ky');
    try {
      assignStandby(once, '2026-10-13', 's-hung');
    } catch {
      // expected
    }
    expect(once).toEqual([{ date: '2026-10-13', staffId: 's-ky' }]);
  });

  it('different days can have different standby people', () => {
    const state = assignStandby(assignStandby(empty, '2026-10-12', 's-ky'), '2026-10-13', 's-hung');
    expect(state).toHaveLength(2);
  });

  it('switching person = clearStandby first, then assignStandby', () => {
    const once = assignStandby(empty, '2026-10-13', 's-ky');
    const switched = assignStandby(clearStandby(once, '2026-10-13'), '2026-10-13', 's-hung');
    expect(switched).toEqual([{ date: '2026-10-13', staffId: 's-hung' }]);
  });
});

describe('buildAssigneeChanges – auto-generated "Procedure assignee changes" table', () => {
  it('no leave in the week -> empty table', () => {
    expect(buildAssigneeChanges({ ...initialLeaveWeek(), leaves: [] })).toEqual([]);
  });

  it('one person on leave, no standby -> 1 row, missing 1 person', () => {
    expect(buildAssigneeChanges(initialLeaveWeek())).toEqual([
      { date: '2026-10-13', half: 'AFTERNOON', absent: ['Dao'], coveredBy: null, missing: 1 },
    ]);
  });

  it('standby person covers one absentee -> missing 0', () => {
    const week = { ...initialLeaveWeek(), standby: [{ date: '2026-10-13', staffId: 's-ky' }] };
    expect(buildAssigneeChanges(week)).toEqual([
      { date: '2026-10-13', half: 'AFTERNOON', absent: ['Dao'], coveredBy: 'Ky', missing: 0 },
    ]);
  });

  it('two absentees, one standby -> still missing 1 (cut procedures!)', () => {
    const week = {
      ...initialLeaveWeek(),
      leaves: [
        { staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' as const },
        { staffId: 's-tho', date: '2026-10-13', half: 'AFTERNOON' as const },
      ],
      standby: [{ date: '2026-10-13', staffId: 's-ky' }],
    };
    expect(buildAssigneeChanges(week)).toEqual([
      { date: '2026-10-13', half: 'AFTERNOON', absent: ['Dao', 'Tho'], coveredBy: 'Ky', missing: 1 },
    ]);
  });

  it('a standby person who is on leave themselves cannot cover', () => {
    const week = {
      ...initialLeaveWeek(),
      leaves: [
        { staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' as const },
        { staffId: 's-ky', date: '2026-10-13', half: 'AFTERNOON' as const },
      ],
      standby: [{ date: '2026-10-13', staffId: 's-ky' }],
    };
    expect(buildAssigneeChanges(week)).toEqual([
      { date: '2026-10-13', half: 'AFTERNOON', absent: ['Dao'], coveredBy: null, missing: 1 },
    ]);
  });

  it('rows are sorted by date, then Morning before Afternoon', () => {
    const week = {
      ...initialLeaveWeek(),
      leaves: [
        { staffId: 's-dao', date: '2026-10-14', half: 'MORNING' as const },
        { staffId: 's-tho', date: '2026-10-12', half: 'AFTERNOON' as const },
        { staffId: 's-hung', date: '2026-10-12', half: 'MORNING' as const },
      ],
    };
    expect(buildAssigneeChanges(week).map((row) => `${row.date} ${row.half}`)).toEqual([
      '2026-10-12 MORNING',
      '2026-10-12 AFTERNOON',
      '2026-10-14 MORNING',
    ]);
  });

  it('ignores leave entries outside the displayed week', () => {
    const week = {
      ...initialLeaveWeek(),
      leaves: [{ staffId: 's-dao', date: '2026-10-20', half: 'MORNING' as const }],
    };
    expect(buildAssigneeChanges(week)).toEqual([]);
  });
});
