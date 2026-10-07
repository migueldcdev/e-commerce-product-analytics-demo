import { expect, type Locator, type Page } from '@playwright/test';

/** The seeded catalog in public/data/records.json. Counts below are derived from it. */
export const TOTAL_RECORDS = 25;

export const RECORDS_URL = '**/data/records.json';

export function resultCount(page: Page): Locator {
  return page.getByTestId('result-count');
}

export function grid(page: Page): Locator {
  return page.getByRole('list', { name: 'Records' });
}

export function cards(page: Page): Locator {
  return grid(page).getByRole('article');
}

export function card(page: Page, title: string): Locator {
  return grid(page).getByRole('article', { name: title, exact: true });
}

/** Card titles in on-screen (DOM) order. */
export async function titles(page: Page): Promise<string[]> {
  return cards(page).getByRole('heading').allInnerTexts();
}

/** Card prices in cents, in order. Parses es-ES currency, e.g. "29,99 €". */
export async function prices(page: Page): Promise<number[]> {
  const texts = await grid(page).getByTestId('price').allInnerTexts();
  return texts.map((text) =>
    Math.round(Number(text.replace(/[^\d,]/g, '').replace(',', '.')) * 100),
  );
}

export function searchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search records' });
}

export function sortSelect(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Sort' });
}

export function toast(page: Page): Locator {
  return page.getByRole('status', { name: 'Notifications' });
}

export function cartButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Cart, \d+ items?$/ });
}

export function cartPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Cart' });
}

export async function openCart(page: Page): Promise<Locator> {
  await cartButton(page).click();
  const panel = cartPanel(page);
  await expect(panel).toBeVisible();
  return panel;
}

/** Opens the browse page and waits for the grid. */
export async function gotoBrowse(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(grid(page).or(page.getByText('No records match your filters'))).toBeVisible();
}

/**
 * The filter controls: the sidebar on desktop, the drawer on mobile (opened on demand).
 * Close the drawer with closeFilters before asserting on the grid on mobile.
 */
export async function openFilters(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.getByRole('complementary', { name: 'Filters' });
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();
  return drawer;
}

export async function closeFilters(page: Page, isMobile: boolean): Promise<void> {
  if (!isMobile) return;
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await drawer.getByRole('button', { name: /^Show \d+ records?$/ }).click();
  await expect(drawer).toBeHidden();
}

/** Number of distinct columns the first cards occupy. */
export async function columnCount(page: Page): Promise<number> {
  const lefts = await cards(page).evaluateAll((elements) =>
    elements.slice(0, 8).map((el) => Math.round(el.getBoundingClientRect().left)),
  );
  return new Set(lefts).size;
}
