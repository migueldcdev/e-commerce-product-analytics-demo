import { expect, test, type Page } from '@playwright/test';
import { stubPostHog } from './support/posthog.ts';

// The build has a stub PostHog key; keep its requests off the network.
test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
});

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('home shows the project name without console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: /e-commerce product analytics demo/i }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a deep link to an unknown path shows Not Found', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/missing');

  await expect(
    page.getByRole('heading', { level: 1, name: /e-commerce product analytics demo/i }),
  ).toBeVisible();
  await expect(page.getByText(/page not found/i)).toBeVisible();
  expect(errors).toEqual([]);
});
