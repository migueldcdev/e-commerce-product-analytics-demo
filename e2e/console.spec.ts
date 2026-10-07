// Runs on both the desktop and mobile projects.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  addAppButton,
  closeConsole,
  consoleLog,
  consolePanel,
  consoleRows,
  mobileTab,
  openConsole,
  pageviewRow,
  rowHeader,
} from './support/console.ts';
import { stubPostHog, type PostHogStub } from './support/posthog.ts';

let posthog: PostHogStub;

test.beforeEach(async ({ page }) => {
  posthog = await stubPostHog(page);
  await page.goto('/');
});

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe('logging', () => {
  test('shows the initial $pageview from PostHog', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);

    await expect(pageviewRow(page, isMobile)).toHaveCount(1);
    await expect(rowHeader(pageviewRow(page, isMobile))).toHaveText(
      /^▸\s*\d{2}:\d{2}:\d{2}\.\d{3}\W*INFO\W*posthog\W*\$pageview\s+\/\s*$/,
    );
  });

  test('a click in the app adds an $autocapture entry', async ({ page, isMobile }) => {
    const button = await addAppButton(page, 'Add to cart');

    if (isMobile) await button.tap();
    else await button.click();
    await openConsole(page, isMobile);

    await expect(
      consoleRows(page, isMobile).filter({
        hasText: /\$autocapture\s+click\s+button "Add to cart"/,
      }),
    ).toHaveCount(1);
  });

  test('clicks inside the console are not captured', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const count = await consoleRows(page, isMobile).count();

    await rowHeader(pageviewRow(page, isMobile)).click();
    await rowHeader(pageviewRow(page, isMobile)).click();

    await expect(consoleRows(page, isMobile)).toHaveCount(count);
  });

  test('Clear empties the list', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    await expect(pageviewRow(page, isMobile)).toHaveCount(1);

    await consolePanel(page, isMobile)
      .getByRole('button', { name: /^clear$/i })
      .click();

    await expect(consoleRows(page, isMobile)).toHaveCount(0);
    await expect(consolePanel(page, isMobile).getByText('No logs yet')).toBeVisible();
  });

  test('no request reaches PostHog ingestion', async ({ page, isMobile }) => {
    const button = await addAppButton(page, 'Buy now');
    for (let i = 0; i < 3; i++) {
      if (isMobile) await button.tap();
      else await button.click();
    }
    await openConsole(page, isMobile);
    await expect(
      consoleRows(page, isMobile).filter({ hasText: '$autocapture' }).first(),
    ).toBeVisible();

    // posthog-js flushes its queue every few seconds; give it the chance to.
    await page.waitForTimeout(4_000);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(500);

    expect(posthog.ingested.map((request) => request.url())).toEqual([]);
  });

  test('prints nothing to the browser console', async ({ page, isMobile }) => {
    const messages: string[] = [];
    page.on('console', (message) => messages.push(`${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await page.reload();
    await openConsole(page, isMobile);
    await expect(pageviewRow(page, isMobile)).toHaveCount(1);

    expect(messages).toEqual([]);
  });
});

test.describe('expanding a row', () => {
  test('shows the full $pageview data', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const row = pageviewRow(page, isMobile);
    const header = rowHeader(row);

    await header.click();

    await expect(header).toHaveAttribute('aria-expanded', 'true');
    const details = page.locator(`#${await header.getAttribute('aria-controls')}`);
    await expect(details).toBeVisible();
    await expect(details).toContainText(/"\$pathname":\s*"\/"/);
  });

  test('long values wrap and the block scrolls inside itself at about 320px', async ({
    page,
    isMobile,
  }) => {
    await openConsole(page, isMobile);
    const header = rowHeader(pageviewRow(page, isMobile));
    await header.click();
    const details = page.locator(`#${await header.getAttribute('aria-controls')}`);
    await expect(details).toBeVisible();

    const box = await details.evaluate((el) => ({
      maxHeight: parseFloat(getComputedStyle(el).maxHeight),
      height: el.getBoundingClientRect().height,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(box.maxHeight).toBeGreaterThanOrEqual(300);
    expect(box.maxHeight).toBeLessThanOrEqual(340);
    expect(box.height).toBeLessThanOrEqual(box.maxHeight + 1);
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);

    const logOverflows = await consoleLog(page, isMobile).evaluate(
      (el) => el.scrollWidth > el.clientWidth + 1,
    );
    expect(logOverflows).toBe(false);
  });

  test('Copy JSON puts parseable JSON on the clipboard', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const row = pageviewRow(page, isMobile);
    await rowHeader(row).click();

    await row.getByRole('button', { name: /copy json/i }).click();

    await expect(row.getByText(/copied/i)).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed).toHaveProperty('$pathname', '/');
  });

  test('two rows can be open at the same time', async ({ page, isMobile }) => {
    const button = await addAppButton(page, 'Second row');
    if (isMobile) await button.tap();
    else await button.click();
    await openConsole(page, isMobile);
    const pageview = rowHeader(pageviewRow(page, isMobile));
    const autocapture = rowHeader(
      consoleRows(page, isMobile).filter({ hasText: /\$autocapture.*"Second row"/ }),
    );

    await pageview.click();
    await autocapture.click();

    await expect(pageview).toHaveAttribute('aria-expanded', 'true');
    await expect(autocapture).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('help tooltip', () => {
  const tooltip = (page: Page) => page.locator('[data-slot="tooltip-content"]');

  test('the $pageview row explains itself, on hover or tap', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const help = pageviewRow(page, isMobile).getByRole('button', { name: 'About $pageview' });
    await expect(help).toBeVisible();

    if (isMobile) await help.tap();
    else await help.hover();

    await expect(tooltip(page)).toBeVisible();
    await expect(tooltip(page)).toContainText(
      'Pageview: Fires on each page load or route change, recording URL, referrer, browser and device.',
    );
    await expect(rowHeader(pageviewRow(page, isMobile))).toHaveAttribute('aria-expanded', 'false');

    if (isMobile) {
      await help.tap();
      await expect(tooltip(page)).toBeHidden();
    }
  });

  test('the $autocapture row has no ? button', async ({ page, isMobile }) => {
    const button = await addAppButton(page, 'No help here');
    if (isMobile) await button.tap();
    else await button.click();
    await openConsole(page, isMobile);

    const row = consoleRows(page, isMobile).filter({ hasText: /"No help here"/ });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('button', { name: /^about/i })).toHaveCount(0);
  });
});

test.describe('scrolling', () => {
  // Generating entries needs clicks in the app while the list is visible, which the
  // full-screen mobile console covers. The scroll logic itself is shared and unit tested.
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  async function firstVisibleRow(page: Page) {
    return consoleLog(page, false).evaluate((log) => {
      const top = log.getBoundingClientRect().top;
      const rows = Array.from(log.querySelectorAll<HTMLElement>('[data-testid="console-entry"]'));
      const row = rows.find((r) => r.getBoundingClientRect().bottom > top + 1);
      if (!row) return null;
      return {
        text: row.querySelector('button[aria-expanded]')?.textContent ?? row.textContent,
        offset: Math.round(row.getBoundingClientRect().top - top),
      };
    });
  }

  test('the list never moves while scrolled up, and "↓ N new" jumps to the latest', async ({
    page,
  }) => {
    const button = await addAppButton(page, 'Make noise');
    const log = consoleLog(page, false);

    for (let i = 0; i < 40; i++) await button.click({ delay: 10 });
    await expect.poll(() => log.evaluate((el) => el.scrollHeight > el.clientHeight * 2)).toBe(true);

    await log.evaluate((el) => {
      el.scrollTop = 60;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(100);
    const scrollTop = await log.evaluate((el) => el.scrollTop);
    const anchor = await firstVisibleRow(page);
    const count = await consoleRows(page, false).count();

    for (let i = 0; i < 5; i++) await button.click({ delay: 10 });
    await expect(consoleRows(page, false)).not.toHaveCount(count);

    expect(await log.evaluate((el) => el.scrollTop)).toBeCloseTo(scrollTop, 0);
    expect(await firstVisibleRow(page)).toEqual(anchor);

    const jump = page.getByRole('button', { name: /\d+ new/ });
    await expect(jump).toBeVisible();
    await expect(jump).toHaveText(/↓\s*\d+ new/);
    await jump.click();

    await expect
      .poll(() => log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight))
      .toBeLessThanOrEqual(2);
    await expect(jump).toBeHidden();
  });
});

test.describe('accessibility', () => {
  test('passes axe with the console closed', async ({ page, isMobile }) => {
    if (isMobile) await expect(mobileTab(page)).toBeVisible();
    else await closeConsole(page, isMobile);

    await expectNoAxeViolations(page);
  });

  test('passes axe with the console open and entries', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    await expect(pageviewRow(page, isMobile)).toHaveCount(1);

    await expectNoAxeViolations(page);
  });

  test('passes axe with a help tooltip shown', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const help = pageviewRow(page, isMobile).getByRole('button', { name: 'About $pageview' });
    await help.click();
    await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test('passes axe with an expanded row', async ({ page, isMobile }) => {
    await openConsole(page, isMobile);
    const header = rowHeader(pageviewRow(page, isMobile));
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');

    await expectNoAxeViolations(page);
  });
});
