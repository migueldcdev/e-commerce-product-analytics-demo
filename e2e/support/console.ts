import { expect, type Locator, type Page } from '@playwright/test';

export const ROW = 'console-entry';

/** The open console: the docked region on desktop, the full-screen dialog on mobile. */
export function consolePanel(page: Page, isMobile: boolean): Locator {
  return isMobile
    ? page.getByRole('dialog', { name: 'Console' })
    : page.getByRole('region', { name: 'Console' });
}

export function consoleLog(page: Page, isMobile: boolean): Locator {
  return consolePanel(page, isMobile).getByRole('log');
}

export function consoleRows(page: Page, isMobile: boolean): Locator {
  return consoleLog(page, isMobile).getByTestId(ROW);
}

export function mobileTab(page: Page): Locator {
  return page.getByRole('button', { name: /^console$/i });
}

/** Makes sure the console list is on screen. A no-op on desktop, where it starts open. */
export async function openConsole(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await mobileTab(page).tap();
  await expect(consoleLog(page, isMobile)).toBeVisible();
}

export async function closeConsole(page: Page, isMobile: boolean): Promise<void> {
  await consolePanel(page, isMobile)
    .getByRole('button', { name: /close console/i })
    .click();
}

/**
 * The app has no buttons yet (the shop arrives in iteration 2), so tests add one to <main>.
 * PostHog autocapture listens on the document, so clicks on it are captured like any other.
 */
export async function addAppButton(page: Page, label: string): Promise<Locator> {
  await page.evaluate((text) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    const main = document.querySelector('main');
    if (!main) throw new Error('<main> not found');
    main.append(button);
  }, label);
  return page.getByRole('main').getByRole('button', { name: label });
}

/** The row header (the expandable button) of a row. */
export function rowHeader(row: Locator): Locator {
  return row.locator('button[aria-expanded]').first();
}

export function pageviewRow(page: Page, isMobile: boolean): Locator {
  return consoleRows(page, isMobile).filter({
    has: page.locator('button[aria-expanded]', { hasText: /posthog\W*\$pageview\s+\/\s*$/ }),
  });
}
