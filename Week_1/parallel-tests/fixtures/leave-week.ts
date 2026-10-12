/**
 * Hardcoded mock data shared by unit, integration and E2E tests.
 * No test in /parallel-tests/ is allowed to hit a real endpoint.
 *
 * Hospital week = Friday -> Thursday. The fixture week is Fri 2026-10-09 -> Thu 2026-10-15.
 */

export type HalfDay = 'MORNING' | 'AFTERNOON';

export interface StaffMember {
  id: string;
  name: string;
}

export interface LeaveEntry {
  staffId: string;
  date: string; // YYYY-MM-DD
  half: HalfDay;
}

export interface StandbyEntry {
  date: string; // YYYY-MM-DD
  staffId: string;
}

/** Shape returned by GET /api/leave-week?departmentId=&weekStart= */
export interface LeaveWeekData {
  departmentId: string;
  departmentName: string;
  weekStart: string;
  days: string[];
  staff: StaffMember[];
  leaves: LeaveEntry[];
  standby: StandbyEntry[];
}

export const DEPARTMENT_ID = 'dept-geriatrics';
export const DEPARTMENT_NAME = 'Geriatrics Department';

export const WEEK_DAYS = [
  '2026-10-09', // Fri
  '2026-10-10', // Sat
  '2026-10-11', // Sun
  '2026-10-12', // Mon
  '2026-10-13', // Tue
  '2026-10-14', // Wed
  '2026-10-15', // Thu
] as const;

export const STAFF: StaffMember[] = [
  { id: 's-dao', name: 'Dao' },
  { id: 's-tho', name: 'Tho' },
  { id: 's-ky', name: 'Ky' },
  { id: 's-hung', name: 'Hung' },
];

/** Initial state: Dao is already on leave Tuesday afternoon, nobody is on standby yet. */
export function initialLeaveWeek(): LeaveWeekData {
  return {
    departmentId: DEPARTMENT_ID,
    departmentName: DEPARTMENT_NAME,
    weekStart: WEEK_DAYS[0],
    days: [...WEEK_DAYS],
    staff: STAFF.map((person) => ({ ...person })),
    leaves: [{ staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' }],
    standby: [],
  };
}
