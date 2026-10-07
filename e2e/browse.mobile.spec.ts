import { expect, test } from '@playwright/test';
import { columnCount, gotoBrowse, openFilters, resultCount } from './support/browse.ts';
import { stubPostHog } from './support/posthog.ts';

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
});

test('one column, sidebar hidden', async ({ page }) => {
  await gotoBrowse(page);

  expect(await columnCount(page)).toBe(1);
  await expect(page.getByRole('complementary', { name: 'Filters' })).toBeHidden();
});

test('works at 360 px without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await gotoBrowse(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('searchbox', { name: 'Search records' })).toBeInViewport();
  await expect(page.getByRole('button', { name: /^Cart,/ })).toBeInViewport();
});

test('the filter drawer counts active filters and shows the live result count', async ({
  page,
}) => {
  await gotoBrowse(page);
  const drawer = await openFilters(page, true);

  await drawer.getByRole('checkbox', { name: 'Punk' }).check();
  await drawer.getByRole('switch', { name: 'In stock only' }).check();
  await expect(drawer.getByRole('button', { name: 'Show 4 records' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('button', { name: 'Filters (2)' })).toBeFocused();
  await expect(resultCount(page)).toHaveText('Showing 4 records');
});
