import { dayLabel, HALF_LABEL } from './labels';
import { HALF_DAYS, type HalfDay, type LeaveWeekData } from './leaveLogic';

interface LeaveGridProps {
  week: LeaveWeekData;
  onToggle: (staffId: string, date: string, half: HalfDay) => void;
  onStandbyChange: (date: string, staffId: string | null) => void;
}

/** Staff × day grid: two half-day toggle buttons per cell, one standby picker per day. */
export function LeaveGrid({ week, onToggle, onStandbyChange }: LeaveGridProps) {
  function isOnLeave(staffId: string, date: string, half: HalfDay): boolean {
    return week.leaves.some((leave) => leave.staffId === staffId && leave.date === date && leave.half === half);
  }
  function standbyOf(date: string): string {
    return week.standby.find((entry) => entry.date === date)?.staffId ?? '';
  }

  return (
    <table role="grid" aria-label="Leave grid" className="leave-grid">
      <thead>
        <tr>
          <th scope="col">Staff</th>
          {week.days.map((day) => (
            <th key={day} scope="col">
              {dayLabel(day)}
            </th>
          ))}
        </tr>
        <tr className="leave-grid__standby">
          <td>Standby</td>
          {week.days.map((day) => (
            <td key={day}>
              <select
                aria-label={`Standby for ${dayLabel(day)}`}
                value={standbyOf(day)}
                onChange={(event) => onStandbyChange(day, event.target.value || null)}>
                <option value="">— None —</option>
                {week.staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </td>
          ))}
        </tr>
      </thead>
      <tbody>
        {week.staff.map((person) => (
          <tr key={person.id}>
            <th scope="row">{person.name}</th>
            {week.days.map((day) => (
              <td key={day} className="leave-grid__cell">
                {HALF_DAYS.map((half) => {
                  const onLeave = isOnLeave(person.id, day, half);
                  const standby = standbyOf(day) === person.id;
                  return (
                    <button
                      key={half}
                      type="button"
                      aria-label={`${person.name} – ${dayLabel(day)} – ${HALF_LABEL[half]}`}
                      aria-pressed={onLeave}
                      className={`leave-grid__half${onLeave ? ' is-leave' : standby ? ' is-standby' : ''}`}
                      onClick={() => onToggle(person.id, day, half)}>
                      {onLeave ? <span className="badge">Leave</span> : standby ? <span className="badge">Standby</span> : null}
                    </button>
                  );
                })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
