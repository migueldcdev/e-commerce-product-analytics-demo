import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { consoleLog } from './support/console.ts';
import { stubPostHog } from './support/posthog.ts';

type Box = { x: number; y: number; width: number; height: number };

const panel = (page: Page) => page.getByRole('region', { name: 'Console' });
const handle = (page: Page) => panel(page).getByRole('separator');
const positionMenu = (page: Page) => panel(page).getByRole('button', { name: /console position/i });
const capitalise = (side: string) => side[0].toUpperCase() + side.slice(1);

async function expectDock(page: Page, side: string) {
  await expect(positionMenu(page)).toHaveAccessibleName(`Console position: ${capitalise(side)}`);
}

async function chooseDock(page: Page, side: string) {
  await positionMenu(page).click();
  await page.getByRole('menuitemradio', { name: capitalise(side) }).click();
  await expect(page.getByRole('menu')).toBeHidden();
}
const valueNow = async (locator: Locator) => Number(await locator.getAttribute('aria-valuenow'));

async function box(locator: Locator): Promise<Box> {
  const result = await locator.boundingBox();
  if (!result) throw new Error('element has no box');
  return result;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - 1 &&
    b.x < a.x + a.width - 1 &&
    a.y < b.y + b.height - 1 &&
    b.y < a.y + a.height - 1
  );
}

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
  await page.goto('/');
});

test('loads with the console open, docked at the bottom', async ({ page }) => {
  await expect(panel(page)).toBeVisible();
  await expect(consoleLog(page, false)).toBeVisible();
  await expectDock(page, 'bottom');

  const viewport = page.viewportSize()!;
  const panelBox = await box(panel(page));
  expect(panelBox.y + panelBox.height).toBeCloseTo(viewport.height, 0);
  expect(panelBox.height).toBeCloseTo(viewport.height * 0.3, -1);
});

test('dragging the handle resizes the console', async ({ page }) => {
  const before = await box(panel(page));
  const start = await valueNow(handle(page));
  const handleBox = await box(handle(page));
  const x = handleBox.x + handleBox.width / 2;
  const y = handleBox.y + handleBox.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 100, { steps: 5 });
  await page.mouse.up();

  expect(await valueNow(handle(page))).toBeCloseTo(start + 100, -1);
  const after = await box(panel(page));
  expect(after.height).toBeCloseTo(before.height + 100, -1);
});

for (const side of ['left', 'right', 'top', 'bottom'] as const) {
  test(`docking ${side} moves the panel and the app reflows around it`, async ({ page }) => {
    const viewport = page.viewportSize()!;
    if (side === 'bottom') await chooseDock(page, 'top');

    await chooseDock(page, side);

    await expectDock(page, side);
    const p = await box(panel(page));
    if (side === 'left') {
      expect(p.x).toBeCloseTo(0, 0);
      expect(p.height).toBeCloseTo(viewport.height, 0);
    }
    if (side === 'right') {
      expect(p.x + p.width).toBeCloseTo(viewport.width, 0);
      expect(p.height).toBeCloseTo(viewport.height, 0);
    }
    if (side === 'top') {
      expect(p.y).toBeCloseTo(0, 0);
      expect(p.width).toBeCloseTo(viewport.width, 0);
    }
    if (side === 'bottom') {
      expect(p.y + p.height).toBeCloseTo(viewport.height, 0);
      expect(p.width).toBeCloseTo(viewport.width, 0);
    }

    const header = await box(page.getByRole('banner'));
    const main = await box(page.getByRole('main'));
    expect(overlaps(p, header)).toBe(false);
    expect(overlaps(p, main)).toBe(false);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  });
}

test('dock and size survive a reload, and the console is still open', async ({ page }) => {
  await chooseDock(page, 'right');
  await handle(page).focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const size = await valueNow(handle(page));
  await panel(page)
    .getByRole('button', { name: /close console/i })
    .click();
  await expect(page.getByRole('button', { name: /open console/i })).toBeVisible();

  await page.reload();

  await expect(panel(page)).toBeVisible();
  await expect(consoleLog(page, false)).toBeVisible();
  await expectDock(page, 'right');
  expect(await valueNow(handle(page))).toBeCloseTo(size, 0);
});

test('Ctrl + ` toggles the console', async ({ page }) => {
  await page.getByRole('heading', { level: 1 }).click();

  await page.keyboard.press('Control+Backquote');
  await expect(consoleLog(page, false)).toBeHidden();
  await expect(page.getByRole('button', { name: /open console/i })).toBeVisible();

  await page.keyboard.press('Control+Backquote');
  await expect(consoleLog(page, false)).toBeVisible();
});

test('the collapsed bar is thin and reopens the console', async ({ page }) => {
  await panel(page)
    .getByRole('button', { name: /close console/i })
    .click();
  const open = page.getByRole('button', { name: /open console/i });
  await expect(open).toBeVisible();
  const bar = await box(panel(page));
  expect(bar.height).toBeLessThanOrEqual(40);

  await open.click();

  await expect(consoleLog(page, false)).toBeVisible();
});

test('the position dropdown lists the four sides with icons and passes axe', async ({ page }) => {
  await positionMenu(page).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const items = menu.getByRole('menuitemradio');
  await expect(items).toHaveText(['Right', 'Top', 'Left', 'Bottom']);
  for (const item of await items.all()) await expect(item.locator('svg').first()).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'Bottom' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(positionMenu(page)).toBeFocused();
});

test('choosing a position does not log an autocapture event', async ({ page }) => {
  const rows = consoleLog(page, false).getByTestId('console-entry');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();

  await chooseDock(page, 'left');
  await page.waitForTimeout(300);

  await expect(rows).toHaveCount(count);
});

test('every console control shows a visible focus ring', async ({ page }) => {
  const controls = [
    positionMenu(page),
    panel(page).getByRole('button', { name: /^clear$/i }),
    panel(page).getByRole('button', { name: /close console/i }),
    handle(page),
  ];
  for (const control of controls) {
    await control.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await control.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        shadow: style.boxShadow !== 'none',
      };
    });
    expect(ring.outline || ring.shadow).toBe(true);
  }
});
