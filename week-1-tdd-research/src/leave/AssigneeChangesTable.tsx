import { dayLabel, HALF_LABEL } from './labels';
import type { AssigneeChangeRow } from './leaveLogic';

function describe(row: AssigneeChangeRow): string {
  const parts = [`${row.absent.join(', ')} on leave`];
  if (row.coveredBy) {
    parts.push(`${row.coveredBy} (standby) covers`);
  }
  if (row.missing > 0) {
    parts.push(`Missing ${row.missing} ${row.missing === 1 ? 'person' : 'people'}`);
  }
  return parts.join(' · ');
}

/** Auto-generated replacement for the hand-written "procedure assignee changes" spreadsheet. */
export function AssigneeChangesTable({ rows }: { rows: AssigneeChangeRow[] }) {
  if (rows.length === 0) {
    return <p className="muted">Nobody is on leave this week.</p>;
  }
  return (
    <table aria-label="Procedure assignee changes" className="changes">
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.date}:${row.half}`} className={row.missing > 0 ? 'is-short' : undefined}>
            <td>
              {dayLabel(row.date)} {HALF_LABEL[row.half]}
            </td>
            <td>{describe(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
