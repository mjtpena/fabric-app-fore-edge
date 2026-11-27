import { expect, test } from '@playwright/test';
import { openApp } from '@x10/shared/e2e';

const CONVENOR = 'demo-convenor';
const BEHIND_READER = 'demo-behind';

test.describe('Fore-Edge smoke & acceptance criteria', () => {
  test('renders fore-edge centrepiece, switches lenses, focuses Today item, and shows list view', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await openApp(page, '/', CONVENOR);
    await expect(page.getByTestId('fore-edge-stage')).toBeVisible();

    // Switch lens to Pace
    await page.getByRole('radiogroup', { name: 'Lens' }).getByRole('radio', { name: /Pace/ }).click();
    await expect(page.getByText(/Pace p\./)).toBeVisible();

    // Focus Today item
    const phone = info.project.name === 'phone';
    if (phone) {
      await page.getByRole('button', { name: /^Today/ }).click();
    }
    await page.getByRole('button', { name: /Next meeting/ }).click();
    if (!phone) {
      await expect(page.getByRole('button', { name: 'Open meeting pack' })).toBeVisible();
    } else {
      await expect(page.getByText(/Meeting ·/).first()).toBeVisible();
    }

    // Switch to List view
    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page.getByRole('heading', { name: 'Readers' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Clara Okafor' }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('AC #1: reader on chapter 4 cannot see chapter 7 note until their page passes it', async ({ page }) => {
    // Tomasz Zielinski is seeded at page 112 (Chapter 4)
    await openApp(page, '/margin', BEHIND_READER);
    await expect(page.getByTestId('margin-notes-list')).toBeVisible();
    await expect(page.getByText(/split-brain trade-off in chapter 7/i)).toHaveCount(0);

    // Move Tomasz's bookmark to page 185 (Chapter 7 starts at 181)
    await openApp(page, '/bookmark', BEHIND_READER);
    await page.getByLabel('Page reached').fill('185');
    await page.getByLabel('Minutes read').fill('90');
    await page.getByRole('button', { name: 'Log bookmark' }).click();
    await expect(page.getByText('Bookmark moved to page 185.')).toBeVisible();

    // Return to Margin: Chapter 7 note is now unlocked!
    await page.goto('/#/margin');
    await expect(page.getByText(/split-brain trade-off in chapter 7/i)).toBeVisible();
  });

  test('AC #3: fog line ignores paused reader (Nadia at p.62) and uses slowest active reader (Owen at p.105)', async ({ page }) => {
    await openApp(page, '/', CONVENOR);
    await expect(page.getByText('Fog line · p.105')).toBeVisible();
  });

  test('AC #5: logging a lower page than previous day is refused', async ({ page }) => {
    // Tomasz is at page 112 from 3 days ago
    await openApp(page, '/bookmark', BEHIND_READER);
    await page.getByLabel('Page reached').fill('95');
    await page.getByLabel('Minutes read').fill('30');
    await page.getByRole('button', { name: 'Log bookmark' }).click();
    await expect(page.getByText(/cannot go backwards/i)).toBeVisible();
  });
});
