import './styles.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { LeaveModal } from './leave/LeaveModal';

/** Minimal "Scheduling" screen: only what the Leave & Standby flow needs. Open /schedule?date=2026-10-12 */
function SchedulePage() {
  const [open, setOpen] = useState(false);
  const date = new URLSearchParams(window.location.search).get('date') ?? new Date().toISOString().slice(0, 10);
  return (
    <main className="page">
      <h1>Scheduling</h1>
      <p className="muted">Date: {date}</p>
      <button type="button" onClick={() => setOpen(true)}>
        Geriatrics Department
      </button>
      <LeaveModal
        departmentId="dept-geriatrics"
        departmentName="Geriatrics Department"
        date={date}
        open={open}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SchedulePage />
  </StrictMode>,
);
