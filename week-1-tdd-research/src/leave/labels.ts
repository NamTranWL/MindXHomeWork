import type { HalfDay } from './leaveLogic';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HALF_LABEL: Record<HalfDay, string> = { MORNING: 'Morning', AFTERNOON: 'Afternoon' };

/** "2026-10-12" -> "Mon 2026-10-12" (UTC, independent of the machine time zone). */
export function dayLabel(date: string): string {
  return `${WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]} ${date}`;
}
