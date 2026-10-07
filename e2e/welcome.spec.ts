import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { grid, searchBox } from './support/browse.ts';
import { stubPostHog } from './support/posthog.ts';
import { welcomeDialog } from './support/welcome.ts';

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
});

function startButton(dialog: ReturnType<typeof welcomeDialog>) {
  return dialog.getByRole('button', { name: 'Understood, start browsing' });
}

test('shows on first load, blocks the store and loads it underneath', async ({ page }) => {
  await page.goto('/');
  const dialog = welcomeDialog(page);

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('heading', { name: 'What is this?' })).toBeVisible();
  await expect(dialog).toContainText(
    'Your clicks, searches and filters on this page are recorded as anonymous events for this demo.',
  );
  await expect(startButton(dialog)).toBeFocused();

  // The overlay intercepts pointer input meant for the store.
  await expect(searchBox(page)).toBeHidden();
  await page.mouse.click(10, 10);
  await expect(dialog).toBeVisible();

  await startButton(dialog).click();
  await expect(dialog).toBeHidden();
  // The catalog loaded while the dialog was open.
  await expect(grid(page).getByRole('article')).not.toHaveCount(0);
  await expect(searchBox(page)).toBeVisible();
});

test('keeps keyboard focus inside and returns it to the page on Esc', async ({ page }) => {
  await page.goto('/');
  const dialog = welcomeDialog(page);
  await expect(startButton(dialog)).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(startButton(dialog)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(startButton(dialog)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('does not reappear on reload or when filters change in the same session', async ({ page }) => {
  await page.goto('/');
  await startButton(welcomeDialog(page)).click();
  await expect(welcomeDialog(page)).toBeHidden();

  await page.reload();
  await expect(grid(page)).toBeVisible();
  await page.goto('/?q=punk');
  await expect(grid(page)).toBeVisible();
  await expect(welcomeDialog(page)).toBeHidden();
});

test('has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  const dialog = welcomeDialog(page);
  await expect(dialog).toBeVisible();
  // Let the fade-in finish so contrast is measured at rest.
  await dialog.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });

  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});

for (const width of [360, 1280]) {
  test(`is readable without horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 360 ? 640 : 800 });
    await page.goto('/');
    const dialog = welcomeDialog(page);
    await expect(dialog).toBeVisible();

    const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box && box.width).toBeLessThanOrEqual(Math.min(width, 560));
    await expect(startButton(dialog)).toBeInViewport();
  });
}

test('keeps the button reachable on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 420 });
  await page.goto('/');

  await expect(startButton(welcomeDialog(page))).toBeInViewport();
});
