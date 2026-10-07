import { expect, test, type Page } from '@playwright/test';
import {
  addAppButton,
  consoleRows,
  mobileTab,
  openConsole,
  pageviewRow,
  rowHeader,
} from './support/console.ts';
import { stubPostHog } from './support/posthog.ts';
import { skipWelcome } from './support/welcome.ts';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Console' });

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
  await skipWelcome(page);
  await page.goto('/');
});

test('only the tab is visible at start', async ({ page }) => {
  await expect(mobileTab(page)).toBeVisible();
  const tab = await mobileTab(page).boundingBox();
  expect(tab?.y).toBeLessThanOrEqual(1);

  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('log')).toHaveCount(0);
  await expect(page.getByRole('separator')).toHaveCount(0);
});

test('a tap in the app shows up as $autocapture once the console opens', async ({ page }) => {
  const button = await addAppButton(page, 'Checkout');
  await button.tap();

  await openConsole(page, true);

  await expect(
    consoleRows(page, true).filter({ hasText: /\$autocapture\s+click\s+button "Checkout"/ }),
  ).toHaveCount(1);
});

test('the open console fills the viewport', async ({ page }) => {
  await openConsole(page, true);

  const viewport = page.viewportSize()!;
  const box = await dialog(page).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeCloseTo(0, 0);
  expect(box!.y).toBeCloseTo(0, 0);
  expect(box!.width).toBeCloseTo(viewport.width, 0);
  expect(box!.height).toBeCloseTo(viewport.height, 0);
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
});

test('an entry can be opened', async ({ page }) => {
  await openConsole(page, true);
  const header = rowHeader(pageviewRow(page, true));

  await header.tap();

  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await expect(dialog(page)).toContainText(/"\$pathname":\s*"\/"/);
});

test('closing works and the page behind does not scroll while open', async ({ page }) => {
  await page.evaluate(() => {
    const filler = document.createElement('div');
    filler.style.height = '3000px';
    filler.textContent = 'filler';
    document.querySelector('main')?.append(filler);
  });
  await openConsole(page, true);

  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

  await dialog(page)
    .getByRole('button', { name: /close console/i })
    .tap();

  await expect(dialog(page)).toHaveCount(0);
  await expect(mobileTab(page)).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});

test('the browser back button closes it', async ({ page }) => {
  await openConsole(page, true);

  await page.goBack();

  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(mobileTab(page)).toBeVisible();
});
