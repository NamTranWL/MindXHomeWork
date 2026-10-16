import type { LeaveEntry, LeaveWeekData, StandbyEntry } from './leaveLogic';

export interface SaveLeaveWeekPayload {
  departmentId: string;
  weekStart: string;
  leaves: LeaveEntry[];
  standby: StandbyEntry[];
}

export async function fetchLeaveWeek(departmentId: string, weekStart: string): Promise<LeaveWeekData> {
  const res = await fetch(`/api/leave-week?${new URLSearchParams({ departmentId, weekStart })}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as LeaveWeekData;
}

export async function saveLeaveWeek(payload: SaveLeaveWeekPayload): Promise<void> {
  const res = await fetch('/api/leave-week', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(String(res.status));
}
