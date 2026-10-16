import { useEffect, useState } from 'react';

import { AssigneeChangesTable } from './AssigneeChangesTable';
import { LeaveGrid } from './LeaveGrid';
import { fetchLeaveWeek, saveLeaveWeek } from './leaveApi';
import {
  assignStandby,
  buildAssigneeChanges,
  clearStandby,
  getHospitalWeek,
  type HalfDay,
  type LeaveWeekData,
  toggleLeave,
} from './leaveLogic';

export interface LeaveModalProps {
  departmentId: string;
  departmentName: string;
  /** Any date of the week to show – the modal opens the hospital week (Fri -> Thu) containing it. */
  date: string;
  open: boolean;
  onClose: () => void;
}

const LOAD_ERROR = 'Could not load leave data. Please try again.';
const SAVE_ERROR = 'Could not save. Your changes are kept – please try again.';

/** "Leave & Standby" modal: edit a week of leave + standby people locally, persist with Save. */
export function LeaveModal({ departmentId, departmentName, date, open, onClose }: LeaveModalProps) {
  const weekStart = getHospitalWeek(date).start;
  const [week, setWeek] = useState<LeaveWeekData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setWeek(null);
    setError(null);
    fetchLeaveWeek(departmentId, weekStart).then(
      (data) => {
        if (!cancelled) setWeek(data);
      },
      () => {
        if (!cancelled) setError(LOAD_ERROR);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, departmentId, weekStart]);

  if (!open) {
    return null;
  }

  function edit(next: LeaveWeekData): void {
    setWeek(next);
    setNotice(null);
  }

  function toggle(staffId: string, day: string, half: HalfDay): void {
    if (week) edit({ ...week, leaves: toggleLeave(week.leaves, { staffId, date: day, half }) });
  }

  function changeStandby(day: string, staffId: string | null): void {
    if (!week) return;
    // The picker REPLACES the day's standby person: clear first, then assign (assignStandby refuses a 2nd person).
    const cleared = clearStandby(week.standby, day);
    edit({ ...week, standby: staffId ? assignStandby(cleared, day, staffId) : cleared });
  }

  async function save(): Promise<void> {
    if (!week) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveLeaveWeek({ departmentId, weekStart, leaves: week.leaves, standby: week.standby });
      setNotice('Saved.');
    } catch {
      setError(SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="leave-modal-title" className="modal">
        <header className="modal__header">
          <h2 id="leave-modal-title">Leave &amp; Standby – {departmentName}</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {!week && !error && <p role="status">Loading leave data…</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {week && (
          <>
            <div className="modal__scroll">
              <LeaveGrid week={week} onToggle={toggle} onStandbyChange={changeStandby} />
            </div>
            <h3>Procedure assignee changes</h3>
            <AssigneeChangesTable rows={buildAssigneeChanges(week)} />
            <footer className="modal__footer">
              {notice && <p role="status">{notice}</p>}
              <button type="button" disabled={saving} onClick={() => void save()}>
                Save
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
