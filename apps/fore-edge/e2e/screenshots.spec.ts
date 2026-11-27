/**
 * Redesign screenshots (6 high-signal PNGs).
 * Run: SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
 */
import { test } from '@playwright/test';
import { openApp } from '@x10/shared/e2e';

const CONVENOR = 'demo-convenor';

test.describe('Fore-Edge screenshots', () => {
  test('desktop-light-stage', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'desktop');
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await openApp(page, '/', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/redesign/desktop-light-stage.png' });
  });

  test('desktop-dark-stage', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'desktop');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await openApp(page, '/', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/redesign/desktop-dark-stage.png' });
  });

  test('desktop-lens', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'desktop');
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await openApp(page, '/', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.getByRole('radiogroup', { name: 'Lens' }).getByRole('radio', { name: /Pace/ }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'docs/redesign/desktop-lens.png' });
  });

  test('desktop-tool', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'desktop');
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await openApp(page, '/margin', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'docs/redesign/desktop-tool.png' });
  });

  test('phone-light-stage', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'phone');
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await openApp(page, '/', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/redesign/phone-light-stage.png' });
  });

  test('phone-dark-stage', async ({ page }, info) => {
    test.skip(!process.env.SCREENSHOTS || info.project.name !== 'phone');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await openApp(page, '/', CONVENOR);
    await page.getByTestId('demo-banner').getByRole('button').first().click().catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/redesign/phone-dark-stage.png' });
  });
});
