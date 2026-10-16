/**
 * E2E – full user journey of the "Leave & Standby" modal (TDD Red phase, Playwright).
 *
 * Network contract (all intercepted – the test never reaches a real backend):
 *   GET  /api/leave-week?departmentId=<id>&weekStart=YYYY-MM-DD  -> LeaveWeekData (fixture)
 *   PUT  /api/leave-week                                          <- SaveLeaveWeekPayload (validated with zod)
 *
 * Journey:
 *   /schedule?date=2026-10-12 → click "Geriatrics Department" → modal visible
 *   → click Dao's Monday Morning cell → pick Ky as Tuesday standby → Save
 *   → intercepted payload must match the schema AND contain exactly the edits.
 *
 * No fixed waits: only web-first assertions (toBeVisible, toHaveAttribute…) and waitForRequest.
 */
import { expect, type Page, type Request, test } from '@playwright/test';
import { z } from 'zod';

import { DEPARTMENT_ID, DEPARTMENT_NAME, initialLeaveWeek } from '../fixtures/leave-week';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

/** The exact body the application must send when "Save" is clicked. Unknown keys are rejected (.strict()). */
const saveLeaveWeekPayload = z
  .object({
    departmentId: z.literal(DEPARTMENT_ID),
    weekStart: isoDate,
    leaves: z.array(
      z.object({ staffId: z.string().min(1), date: isoDate, half: z.enum(['MORNING', 'AFTERNOON']) }).strict(),
    ),
    standby: z
      .array(z.object({ date: isoDate, staffId: z.string().min(1) }).strict())
      .refine((rows) => new Set(rows.map((row) => row.date)).size === rows.length, {
        message: 'at most one standby person per day',
      }),
  })
  .strict();

type SaveLeaveWeekPayload = z.infer<typeof saveLeaveWeekPayload>;

/**
 * Mock every API call. Registered in this order on purpose: Playwright tries the LAST registered route first,
 * so the specific /api/leave-week handler wins and the catch-all only sees unexpected calls (→ fail loudly).
 */
async function mockApi(page: Page): Promise<{ unexpected: string[] }> {
  const unexpected: string[] = [];
  await page.route('**/api/**', async (route) => {
    unexpected.push(`${route.request().method()} ${route.request().url()}`);
    await route.fulfill({ status: 501, json: { message: 'Not mocked in parallel-tests' } });
  });
  await page.route('**/api/leave-week**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, json: initialLeaveWeek() });
      return;
    }
    if (request.method() === 'PUT') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fallback();
  });
  return { unexpected };
}

async function openLeaveModal(page: Page) {
  await page.goto('/schedule?date=2026-10-12');
  await page.getByRole('button', { name: DEPARTMENT_NAME }).click();
  const modal = page.getByRole('dialog', { name: `Leave & Standby – ${DEPARTMENT_NAME}` });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('grid', { name: 'Leave grid' })).toBeVisible();
  return modal;
}

test.describe('Leave & Standby – full flow', () => {
  test('department button opens the modal for the hospital week Fri 09/10 → Thu 15/10', async ({ page }) => {
    const { unexpected } = await mockApi(page);
    const weekRequest = page.waitForRequest(
      (request) => request.url().includes('/api/leave-week') && request.method() === 'GET',
    );

    const modal = await openLeaveModal(page);

    const url = new URL((await weekRequest).url());
    expect(url.searchParams.get('departmentId')).toBe(DEPARTMENT_ID);
    expect(url.searchParams.get('weekStart')).toBe('2026-10-09');
    await expect(modal.getByRole('columnheader', { name: 'Fri 2026-10-09' })).toBeVisible();
    await expect(modal.getByRole('columnheader', { name: 'Thu 2026-10-15' })).toBeVisible();
    expect(unexpected).toEqual([]);
  });

  test('leave on Monday morning + standby on Tuesday → Save sends a schema-valid payload', async ({ page }) => {
    const { unexpected } = await mockApi(page);
    const modal = await openLeaveModal(page);

    // 1. Monday morning leave for Dao
    const mondayMorning = modal.getByRole('button', { name: 'Dao – Mon 2026-10-12 – Morning' });
    await mondayMorning.click();
    await expect(mondayMorning).toHaveAttribute('aria-pressed', 'true');
    await expect(mondayMorning).toContainText('Leave');

    // 2. Ky is the standby person on Tuesday
    const tuesdayStandby = modal.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' });
    await tuesdayStandby.selectOption({ label: 'Ky' });
    await expect(tuesdayStandby).toHaveValue('s-ky');

    // 3. Save and intercept the request body
    const saveRequest = page.waitForRequest(
      (request: Request) => request.url().includes('/api/leave-week') && request.method() === 'PUT',
    );
    await modal.getByRole('button', { name: 'Save' }).click();
    const body: unknown = (await saveRequest).postDataJSON();

    // Schema check – gives a readable error list if the shape is wrong.
    const parsed = saveLeaveWeekPayload.safeParse(body);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues, null, 2)).toBe(true);

    // Content check – exactly the initial leave + our two edits.
    const payload = parsed.data as SaveLeaveWeekPayload;
    expect(payload.weekStart).toBe('2026-10-09');
    expect(payload.leaves).toHaveLength(2);
    expect(payload.leaves).toEqual(
      expect.arrayContaining([
        { staffId: 's-dao', date: '2026-10-13', half: 'AFTERNOON' },
        { staffId: 's-dao', date: '2026-10-12', half: 'MORNING' },
      ]),
    );
    expect(payload.standby).toEqual([{ date: '2026-10-13', staffId: 's-ky' }]);

    await expect(modal.getByRole('status')).toHaveText('Saved.');
    expect(unexpected).toEqual([]);
  });

  test('the "Procedure assignee changes" table reflects the edits before saving', async ({ page }) => {
    await mockApi(page);
    const modal = await openLeaveModal(page);

    await modal.getByRole('button', { name: 'Tho – Tue 2026-10-13 – Afternoon' }).click();
    await modal.getByRole('combobox', { name: 'Standby for Tue 2026-10-13' }).selectOption({ label: 'Ky' });

    const table = modal.getByRole('table', { name: 'Procedure assignee changes' });
    await expect(table.getByRole('row')).toHaveCount(2); // header + 1 row
    await expect(table.getByRole('row').nth(1)).toContainText('Dao, Tho on leave');
    await expect(table.getByRole('row').nth(1)).toContainText('Ky (standby) covers');
    await expect(table.getByRole('row').nth(1)).toContainText('Missing 1 person');
  });

  test('a failed save shows the exact error and keeps the modal open', async ({ page }) => {
    await mockApi(page);
    // Override only the PUT for this test (registered last → tried first).
    await page.route('**/api/leave-week', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, json: { message: 'boom' } });
        return;
      }
      await route.fallback();
    });
    const modal = await openLeaveModal(page);

    await modal.getByRole('button', { name: 'Dao – Mon 2026-10-12 – Morning' }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal.getByRole('alert')).toHaveText('Could not save. Your changes are kept – please try again.');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Dao – Mon 2026-10-12 – Morning' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
