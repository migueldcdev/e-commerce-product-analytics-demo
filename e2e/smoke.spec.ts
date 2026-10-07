import { expect, test, type Page } from '@playwright/test';
import { stubPostHog } from './support/posthog.ts';
import { skipWelcome } from './support/welcome.ts';

// The build has a stub PostHog key; keep its requests off the network.
test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
  await skipWelcome(page);
});

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('home shows the store and its records without console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');

  await expect(page.getByRole('link', { name: /side a records, home/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Records' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Records' }).getByRole('article')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a deep link to an unknown path shows Not Found', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/missing');

  await expect(page.getByRole('link', { name: /side a records, home/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /page not found/i })).toBeVisible();
  expect(errors).toEqual([]);
});
