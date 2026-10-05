import { expect, test, type Page } from '@playwright/test';

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

  await expect(page.getByRole('heading', { level: 1, name: /posthog demo shop/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a deep link to an unknown path shows Not Found', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/missing');

  await expect(page.getByRole('heading', { level: 1, name: /posthog demo shop/i })).toBeVisible();
  await expect(page.getByText(/page not found/i)).toBeVisible();
  expect(errors).toEqual([]);
});
