import type { Locator, Page } from '@playwright/test';

/** Must match WELCOME_DISMISSED_KEY in src/welcome/WelcomeDialog.tsx. */
const WELCOME_DISMISSED_KEY = 'demo-welcome-dismissed';

export function welcomeDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'This is a demo' });
}

/** Marks the welcome screen as already seen, so specs start on the store itself. */
export async function skipWelcome(page: Page): Promise<void> {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), WELCOME_DISMISSED_KEY);
}
