/**
 * Pure business rules of the "Leave & Standby" feature. No React, no network, no clock –
 * everything works on plain `YYYY-MM-DD` strings so results never depend on the machine time zone.
 */

export type HalfDay = 'MORNING' | 'AFTERNOON';

export const HALF_DAYS: readonly HalfDay[] = ['MORNING', 'AFTERNOON'];

export interface StaffMember {
  id: string;
  name: string;
}

export interface LeaveEntry {
  staffId: string;
  date: string;
  half: HalfDay;
}

export interface StandbyEntry {
  date: string;
  staffId: string;
}

export interface LeaveWeekData {
  departmentId: string;
  departmentName: string;
  weekStart: string;
  days: string[];
  staff: StaffMember[];
  leaves: LeaveEntry[];
  standby: StandbyEntry[];
}

export interface HospitalWeek {
  start: string;
  end: string;
  days: string[];
}

/** One row of the "Procedure assignee changes" table. */
export interface AssigneeChangeRow {
  date: string;
  half: HalfDay;
  /** Names of regular staff on leave in that half-day. */
  absent: string[];
  /** Name of the standby person covering, or null if there is none / they are on leave too. */
  coveredBy: string | null;
  /** People still missing after the standby person covers one absentee. */
  missing: number;
}

const DAY_MS = 86_400_000;
const FRIDAY = 5; // Date#getUTCDay(): 0 = Sun … 5 = Fri
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toEpochDay(date: string): number {
  const ms = ISO_DATE.test(date) ? Date.parse(`${date}T00:00:00Z`) : Number.NaN;
  // Date.parse rolls 2026-02-30 over to March – reject anything that does not round-trip.
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid date: "${date}" (expected YYYY-MM-DD)`);
  }
  return ms;
}

function fromEpochDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The hospital week (Friday -> Thursday) that contains `date`. */
export function getHospitalWeek(date: string): HospitalWeek {
  const ms = toEpochDay(date);
  const daysSinceFriday = (new Date(ms).getUTCDay() - FRIDAY + 7) % 7;
  const start = ms - daysSinceFriday * DAY_MS;
  const days = Array.from({ length: 7 }, (_, index) => fromEpochDay(start + index * DAY_MS));
  return { start: days[0] as string, end: days[6] as string, days };
}

function sameLeave(a: LeaveEntry, b: LeaveEntry): boolean {
  return a.staffId === b.staffId && a.date === b.date && a.half === b.half;
}

/** Click on a half-day cell: add the leave if absent, remove it if present. Never mutates `leaves`. */
export function toggleLeave(leaves: readonly LeaveEntry[], entry: LeaveEntry): LeaveEntry[] {
  return leaves.some((leave) => sameLeave(leave, entry))
    ? leaves.filter((leave) => !sameLeave(leave, entry))
    : [...leaves, { ...entry }];
}

/**
 * Assign the standby person of a day. A day holds at most ONE standby person: assigning someone else while the day
 * is taken throws – the caller must `clearStandby` first (an explicit decision, never a silent overwrite).
 */
export function assignStandby(standby: readonly StandbyEntry[], date: string, staffId: string): StandbyEntry[] {
  const current = standby.find((entry) => entry.date === date);
  if (current && current.staffId !== staffId) {
    throw new Error(`Only one standby person is allowed per day: ${date} already has ${current.staffId}`);
  }
  return current ? [...standby] : [...standby, { date, staffId }];
}

export function clearStandby(standby: readonly StandbyEntry[], date: string): StandbyEntry[] {
  return standby.filter((entry) => entry.date !== date);
}

/**
 * Auto-generated "Procedure assignee changes": one row per half-day of the week where regular staff are on leave,
 * sorted by date then Morning before Afternoon. The standby person is not a regular worker, so their own leave does
 * not create a gap – it only means they cannot cover.
 */
export function buildAssigneeChanges(week: LeaveWeekData): AssigneeChangeRow[] {
  const nameOf = (id: string) => week.staff.find((person) => person.id === id)?.name ?? id;
  const rows: AssigneeChangeRow[] = [];
  for (const date of week.days) {
    const standbyId = week.standby.find((entry) => entry.date === date)?.staffId ?? null;
    for (const half of HALF_DAYS) {
      const onLeave = week.leaves
        .filter((leave) => leave.date === date && leave.half === half)
        .map((leave) => leave.staffId);
      const absent = onLeave.filter((id) => id !== standbyId);
      if (absent.length === 0) {
        continue;
      }
      const covers = standbyId !== null && !onLeave.includes(standbyId);
      rows.push({
        date,
        half,
        absent: absent.map(nameOf),
        coveredBy: covers ? nameOf(standbyId) : null,
        missing: absent.length - (covers ? 1 : 0),
      });
    }
  }
  return rows;
}

export interface CoverageSummary {
  halfDaysWithLeave: number;
  uncoveredHalfDays: number;
  missingPeople: number;
}

/** Summary of the "Procedure assignee changes" table (shown as a warning in the modal). */
export function summarizeCoverage(rows: readonly AssigneeChangeRow[]): CoverageSummary {
  return {
    halfDaysWithLeave: rows.length,
    uncoveredHalfDays: rows.filter((row) => row.missing > 0).length,
    missingPeople: rows.reduce((total, row) => total + row.missing, 0),
  };
}
