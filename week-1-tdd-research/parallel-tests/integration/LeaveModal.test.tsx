/**
 * INTEGRATION – <LeaveModal /> rendering + state updates with React Testing Library (TDD Red phase).
 *
 * Contract the implementation must provide:
 *   src/leave/LeaveModal.tsx  -> export function LeaveModal(props: { departmentId; departmentName; date; open; onClose })
 *   src/leave/leaveApi.ts     -> export fetchLeaveWeek(departmentId, weekStart): Promise<LeaveWeekData>
 *                                export saveLeaveWeek(payload): Promise<void>
 *
 * Accessibility contract (queried by role + name, never by CSS class):
 *   dialog       "Leave & Standby – <department name>"
 *   grid         "Leave grid"  with 7 columnheaders "Fri 2026-10-09" … "Thu 2026-10-15"
 *   button       "<staff> – <Ddd YYYY-MM-DD> – Morning|Afternoon"  (aria-pressed = on leave, shows a "Leave" badge)
 *   combobox     "Standby for <Ddd YYYY-MM-DD>"  (options: "— None —" + staff names)
 *   table        "Procedure assignee changes"
 *
 * The API module is mocked: no real network. No setTimeout / fixed waits – only findBy* / waitFor.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchLeaveWeek, saveLeaveWeek } from '../../src/leave/leaveApi';
import { LeaveModal } from '../../src/leave/LeaveModal';
import { DEPARTMENT_ID, DEPARTMENT_NAME, initialLeaveWeek } from '../fixtures/leave-week';

vi.mock('../../src/leave/leaveApi', () => ({
  fetchLeaveWeek: vi.fn(),
  saveLeaveWeek: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchLeaveWeek);
const mockedSave = vi.mocked(saveLeaveWeek);

const DAY_HEADERS = [
  'Fri 2026-10-09',
  'Sat 2026-10-10',
  'Sun 2026-10-11',
  'Mon 2026-10-12',
  'Tue 2026-10-13',
  'Wed 2026-10-14',
  'Thu 2026-10-15',
];

function renderModal(date = '2026-10-12') {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <LeaveModal departmentId={DEPARTMENT_ID} departmentName={DEPARTMENT_NAME} date={date} open onClose={onClose} />,
  );
  return { user, onClose };
}

/** Wait until the mocked data is on screen (grid present). */
async function findGrid() {
  return screen.findByRole('grid', { name: 'Leave grid' });
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedSave.mockReset();
  mockedFetch.mockResolvedValue(initialLeaveWeek());
  mockedSave.mockResolvedValue(undefined);
});

describe('<LeaveModal /> – loading', () => {
  it('opens as a dialog titled with the department name', async () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: `Leave & Standby – ${DEPARTMENT_NAME}` })).toBeInTheDocument();
    await findGrid();
  });

  it('shows a loading state, then fetches the hospital week (Fri -> Thu) containing the given date', async () => {
    renderModal('2026-10-12');
    expect(screen.getByRole('status')).toHaveTextContent('Loading leave data…');
    await findGrid();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(DEPARTMENT_ID, '2026-10-09');
  });

  it('shows an exact error message when the API call fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('500'));
    renderModal();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load leave data. Please try again.');
  });
});

describe('<LeaveModal /> – grid layout', () => {
  it('renders exactly 7 day columns, Friday -> Thursday, in order', async () => {
    renderModal();
    const grid = await findGrid();
    const headers = within(grid)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.trim())
      .filter((text) => text && DAY_HEADERS.includes(text));
    expect(headers).toEqual(DAY_HEADERS);
  });

  it('every staff member has a Morning and an Afternoon cell for every day (4 staff × 7 days × 2 = 56)', async () => {
    renderModal();
    const grid = await findGrid();
    const cells = within(grid).getAllByRole('button', { name: / – (Morning|Afternoon)$/ });
    expect(cells).toHaveLength(56);
    for (const day of DAY_HEADERS) {
      expect(within(grid).getByRole('button', { name: `Dao – ${day} – Morning` })).toBeInTheDocument();
      expect(within(grid).getByRole('button', { name: `Dao – ${day} – Afternoon` })).toBeInTheDocument();
    }
  });

  it('renders leave from the initial data (Dao, Tuesday afternoon)', async () => {
    renderModal();
    const cell = within(await findGrid()).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Afternoon' });
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(within(cell).getByText('Leave')).toBeInTheDocument();
  });
});

describe('<LeaveModal /> – toggling leave', () => {
  it('clicking an empty half-day cell adds a "Leave" badge', async () => {
    const { user } = renderModal();
    const cell = within(await findGrid()).getByRole('button', { name: 'Tho – Mon 2026-10-12 – Morning' });
    expect(cell).toHaveAttribute('aria-pressed', 'false');

    await user.click(cell);

    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(within(cell).getByText('Leave')).toBeInTheDocument();
  });

  it('clicking the same cell again removes the leave', async () => {
    const { user } = renderModal();
    const cell = within(await findGrid()).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Afternoon' });

    await user.click(cell);

    expect(cell).toHaveAttribute('aria-pressed', 'false');
    expect(within(cell).queryByText('Leave')).not.toBeInTheDocument();
  });

  it('toggling Morning does not touch Afternoon of the same day', async () => {
    const { user } = renderModal();
    const grid = await findGrid();
    await user.click(within(grid).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Morning' }));
    expect(within(grid).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Morning' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(grid).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Afternoon' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not call the save API while editing (only the Save button persists)', async () => {
    const { user } = renderModal();
    await user.click(within(await findGrid()).getByRole('button', { name: 'Tho – Mon 2026-10-12 – Morning' }));
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('<LeaveModal /> – standby person', () => {
  it('each day has one standby picker with "— None —" + every staff member', async () => {
    renderModal();
    await findGrid();
    for (const day of DAY_HEADERS) {
      const picker = screen.getByRole('combobox', { name: `Standby for ${day}` });
      expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual([
        '— None —',
        'Dao',
        'Tho',
        'Ky',
        'Hung',
      ]);
    }
  });

  it('selecting a standby person marks that person\'s cells for the day as "Standby"', async () => {
    const { user } = renderModal();
    const grid = await findGrid();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' }), 'Ky');

    expect(screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' })).toHaveValue('s-ky');
    expect(
      within(within(grid).getByRole('button', { name: 'Ky – Tue 2026-10-13 – Morning' })).getByText('Standby'),
    ).toBeInTheDocument();
  });

  it('choosing another person REPLACES the standby – there is never more than one per day', async () => {
    const { user } = renderModal();
    const grid = await findGrid();
    const picker = screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' });

    await user.selectOptions(picker, 'Ky');
    await user.selectOptions(picker, 'Hung');

    expect(picker).toHaveValue('s-hung');
    expect(within(grid).getAllByText('Standby').length).toBeGreaterThan(0);
    expect(
      within(within(grid).getByRole('button', { name: 'Ky – Tue 2026-10-13 – Morning' })).queryByText('Standby'),
    ).not.toBeInTheDocument();
  });

  it('"— None —" clears the standby of that day', async () => {
    const { user } = renderModal();
    await findGrid();
    const picker = screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' });

    await user.selectOptions(picker, 'Ky');
    await user.selectOptions(picker, '— None —');

    expect(picker).toHaveValue('');
  });
});

describe('<LeaveModal /> – "Procedure assignee changes" table', () => {
  /** One string per body row: "<when> | <change>" (columns: When, Change). */
  function tableRows() {
    const table = screen.getByRole('table', { name: 'Procedure assignee changes' });
    // first row = header
    return within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim())
          .join(' | '),
      );
  }

  it('is generated from the initial data', async () => {
    renderModal();
    await findGrid();
    expect(tableRows()).toEqual(['Tue 2026-10-13 Afternoon | Dao on leave · Missing 1 person']);
  });

  it('updates live when leave is added and a standby person is chosen', async () => {
    const { user } = renderModal();
    const grid = await findGrid();

    await user.click(within(grid).getByRole('button', { name: 'Tho – Tue 2026-10-13 – Afternoon' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' }), 'Ky');

    await waitFor(() =>
      expect(tableRows()).toEqual(['Tue 2026-10-13 Afternoon | Dao, Tho on leave · Ky (standby) covers · Missing 1 person']),
    );
  });

  it('shows an empty-state message when nobody is on leave', async () => {
    const { user } = renderModal();
    await user.click(within(await findGrid()).getByRole('button', { name: 'Dao – Tue 2026-10-13 – Afternoon' }));
    expect(screen.getByText('Nobody is on leave this week.')).toBeInTheDocument();
  });
});

describe('<LeaveModal /> – saving', () => {
  it('Save sends the edited week once, then reports success', async () => {
    const { user } = renderModal();
    const grid = await findGrid();
    await user.click(within(grid).getByRole('button', { name: 'Tho – Mon 2026-10-12 – Morning' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' }), 'Ky');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    expect(mockedSave).toHaveBeenCalledWith({
      departmentId: DEPARTMENT_ID,
      weekStart: '2026-10-09',
      leaves: expect.arrayContaining([
        { staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' },
        { staffId: 's-tho', date: '2026-10-12', half: 'MORNING' },
      ]),
      standby: [{ date: '2026-10-13', staffId: 's-ky' }],
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
  });

  it('shows an exact error message when saving fails and keeps the edits', async () => {
    mockedSave.mockRejectedValueOnce(new Error('500'));
    const { user } = renderModal();
    const cell = within(await findGrid()).getByRole('button', { name: 'Tho – Mon 2026-10-12 – Morning' });
    await user.click(cell);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save. Your changes are kept – please try again.');
    expect(cell).toHaveAttribute('aria-pressed', 'true');
  });
});
