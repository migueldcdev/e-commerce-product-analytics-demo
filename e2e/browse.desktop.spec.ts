import { expect, test } from '@playwright/test';
import { columnCount, gotoBrowse, resultCount } from './support/browse.ts';
import { stubPostHog } from './support/posthog.ts';

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
});

test('4 columns on desktop, 2 on tablet', async ({ page }) => {
  await gotoBrowse(page);
  expect(await columnCount(page)).toBe(4);

  await page.setViewportSize({ width: 900, height: 1000 });
  await expect.poll(() => columnCount(page)).toBe(2);
});

test('the grid is symmetric: each row aligns and columns are equal width', async ({ page }) => {
  await gotoBrowse(page);
  const boxes = await page
    .getByRole('list', { name: 'Records' })
    .getByRole('article')
    .evaluateAll((els) =>
      els.slice(0, 8).map((el) => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), width: Math.round(r.width) };
      }),
    );

  for (const row of [boxes.slice(0, 4), boxes.slice(4, 8)]) {
    expect(new Set(row.map((b) => b.top)).size).toBe(1);
  }
  expect(new Set(boxes.map((b) => b.width)).size).toBe(1);
});

test('filters sit in a sidebar; no drawer button', async ({ page }) => {
  await gotoBrowse(page);

  await expect(page.getByRole('complementary', { name: 'Filters' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filters/ })).toBeHidden();
});

test('filters work from the keyboard with a visible focus ring', async ({ page }) => {
  await gotoBrowse(page);
  const sidebar = page.getByRole('complementary', { name: 'Filters' });
  const punk = sidebar.getByRole('checkbox', { name: 'Punk' });

  await punk.focus();
  await page.keyboard.press('Space');
  await expect(punk).toBeChecked();
  await expect(resultCount(page)).toHaveText('Showing 4 records');

  await page.keyboard.press('Tab');
  const next = sidebar.getByRole('checkbox', { name: 'R&B' });
  await expect(next).toBeFocused();
  const ring = await next.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ring).not.toBe('none');

  const stock = sidebar.getByRole('switch', { name: 'In stock only' });
  await stock.focus();
  await page.keyboard.press('Space');
  await expect(stock).toBeChecked();
});
