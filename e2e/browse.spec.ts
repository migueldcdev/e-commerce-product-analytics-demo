import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  card,
  cards,
  cartButton,
  cartPanel,
  closeFilters,
  gotoBrowse,
  grid,
  openCart,
  openFilters,
  prices,
  RECORDS_URL,
  resultCount,
  searchBox,
  sortSelect,
  titles,
  toast,
  TOTAL_RECORDS,
} from './support/browse.ts';
import { stubPostHog } from './support/posthog.ts';
import { skipWelcome } from './support/welcome.ts';

test.beforeEach(async ({ page }) => {
  await stubPostHog(page);
  await skipWelcome(page);
});

test.describe('catalog', () => {
  test('shows every record in the JSON order with a result count', async ({ page }) => {
    await gotoBrowse(page);

    await expect(cards(page)).toHaveCount(TOTAL_RECORDS);
    await expect(resultCount(page)).toHaveText(`Showing ${TOTAL_RECORDS} records`);
    await expect(sortSelect(page)).toHaveValue('featured');
    expect((await titles(page)).slice(0, 3)).toEqual(['To Pimp a Butterfly', 'Rumours', 'SOS']);
  });

  test('formats prices as es-ES euros', async ({ page }) => {
    await gotoBrowse(page);

    await expect(card(page, 'Abbey Road').getByTestId('price')).toHaveText(/^29,99\s€$/);
    await expect(
      card(page, "Sgt. Pepper's Lonely Hearts Club Band").getByTestId('price'),
    ).toHaveText(/^129,99\s€$/);
  });

  test('marks new, low-stock and sold-out records', async ({ page }) => {
    await gotoBrowse(page);

    await expect(card(page, 'SOS')).toContainText('New');
    await expect(card(page, 'Abbey Road')).toContainText('Only 2 left');
    const soldOut = card(page, 'Rumours').getByRole('button', { name: 'Rumours: sold out' });
    await expect(soldOut).toHaveAttribute('aria-disabled', 'true');
    await expect(soldOut).toHaveText('Sold out');
  });
});

test.describe('search', () => {
  test('matches artist, title and genre, case-insensitively', async ({ page }) => {
    await gotoBrowse(page);

    await searchBox(page).fill('BEATLES');
    await expect(resultCount(page)).toHaveText('Showing 2 records');
    await expect(page).toHaveURL(/[?&]q=BEATLES/);

    await searchBox(page).fill('illmatic');
    await expect.poll(() => titles(page)).toEqual(['Illmatic']);

    await searchBox(page).fill('hip-hop');
    await expect(resultCount(page)).toHaveText('Showing 4 records');

    await searchBox(page).fill('beyonce');
    await expect.poll(() => titles(page)).toEqual(['Lemonade']);
  });

  test('waits 300 ms after the last keystroke', async ({ page }) => {
    await page.clock.install();
    await gotoBrowse(page);
    // Stop time so typing cannot run the debounce timer on its own.
    await page.clock.pauseAt(Date.now() + 60_000);

    await searchBox(page).pressSequentially('punk');
    await page.clock.runFor(299);
    await expect(resultCount(page)).toHaveText(`Showing ${TOTAL_RECORDS} records`);
    expect(new URL(page.url()).searchParams.has('q')).toBe(false);

    await page.clock.runFor(1);
    await expect(resultCount(page)).toHaveText('Showing 4 records');
    await expect(page).toHaveURL(/[?&]q=punk/);
  });
});

test.describe('filters', () => {
  test('OR within a group, AND across groups', async ({ page, isMobile }) => {
    await gotoBrowse(page);
    const filters = await openFilters(page, isMobile);

    await filters.getByRole('checkbox', { name: 'Punk' }).check();
    await filters.getByRole('checkbox', { name: 'Hip-Hop' }).check();
    await filters.getByRole('checkbox', { name: '2LP' }).check();
    await closeFilters(page, isMobile);

    await expect(resultCount(page)).toHaveText('Showing 3 records');
    expect(await titles(page)).toEqual(['To Pimp a Butterfly', 'London Calling', 'Ready to Die']);
    await expect(page).toHaveURL(/genre=Punk%2CHip-Hop/);
    await expect(page).toHaveURL(/format=2LP/);
  });

  test('price range is inclusive and in euros', async ({ page, isMobile }) => {
    await gotoBrowse(page);
    const filters = await openFilters(page, isMobile);

    await filters.getByLabel('Max price').fill('25');
    await closeFilters(page, isMobile);

    await expect(resultCount(page)).toHaveText('Showing 7 records');
    for (const price of await prices(page)) expect(price).toBeLessThanOrEqual(2500);
  });

  test('in stock only hides sold-out records', async ({ page, isMobile }) => {
    await gotoBrowse(page);
    const filters = await openFilters(page, isMobile);

    await filters.getByRole('switch', { name: 'In stock only' }).check();
    await closeFilters(page, isMobile);

    await expect(resultCount(page)).toHaveText('Showing 22 records');
    await expect(card(page, 'Rumours')).toHaveCount(0);
    await expect(page).toHaveURL(/stock=1/);
  });

  test('"Clear all filters" resets search and filters but keeps the sort', async ({ page }) => {
    await gotoBrowse(page, '/?q=the&genre=Rock&stock=1&sort=artist');
    await expect(searchBox(page)).toHaveValue('the');

    await page.getByRole('link', { name: 'Clear all filters' }).click();

    await expect(resultCount(page)).toHaveText(`Showing ${TOTAL_RECORDS} records`);
    await expect(searchBox(page)).toHaveValue('');
    await expect(sortSelect(page)).toHaveValue('artist');
    await expect(page.getByRole('link', { name: 'Clear all filters' })).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('?sort=artist');
  });
});

test.describe('sort', () => {
  test('price low→high and high→low', async ({ page }) => {
    await gotoBrowse(page);

    await sortSelect(page).selectOption({ label: 'Price low→high' });
    await expect(page).toHaveURL(/sort=price-asc/);
    const asc = await prices(page);
    expect(asc).toEqual(asc.toSorted((a, b) => a - b));

    await sortSelect(page).selectOption({ label: 'Price high→low' });
    const desc = await prices(page);
    expect(desc).toEqual(desc.toSorted((a, b) => b - a));
    expect((await titles(page))[0]).toBe("Sgt. Pepper's Lonely Hearts Club Band");
  });

  test('newest release and artist A–Z', async ({ page }) => {
    await gotoBrowse(page);

    await sortSelect(page).selectOption({ label: 'Newest release' });
    expect((await titles(page)).slice(0, 2)).toEqual(['SOS', 'folklore']);

    await sortSelect(page).selectOption({ label: 'Artist A–Z' });
    const artists = await grid(page)
      .getByRole('article')
      .evaluateAll((els) => els.map((el) => el.querySelector('p')?.textContent ?? ''));
    expect(artists[0]).toBe('Beyoncé');
    expect(artists).toEqual(artists.toSorted((a, b) => a.localeCompare(b, 'en')));
  });
});

test.describe('URL state', () => {
  test('a deep link restores search, filters and sort, and survives a reload', async ({
    page,
    isMobile,
  }) => {
    await gotoBrowse(page, '/?genre=Rock&stock=1&sort=price-asc');

    await expect(resultCount(page)).toHaveText('Showing 8 records');
    await expect(sortSelect(page)).toHaveValue('price-asc');
    await page.reload();
    await expect(resultCount(page)).toHaveText('Showing 8 records');

    const filters = await openFilters(page, isMobile);
    await expect(filters.getByRole('checkbox', { name: 'Rock' })).toBeChecked();
    await expect(filters.getByRole('switch', { name: 'In stock only' })).toBeChecked();
  });

  test('ignores malformed params', async ({ page }) => {
    await gotoBrowse(page, '/?sort=random&format=CD&min=abc');

    await expect(resultCount(page)).toHaveText(`Showing ${TOTAL_RECORDS} records`);
    await expect(sortSelect(page)).toHaveValue('featured');
  });
});

test.describe('states', () => {
  test('loading shows skeletons sized like the cards', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(RECORDS_URL, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto('/');

    const loading = page.getByRole('status', { name: 'Loading records' });
    await expect(loading).toBeVisible();
    const cells = page.getByTestId('skeleton-cell');
    await expect(cells).toHaveCount(8);
    const skeleton = (await cells.first().boundingBox())!;

    release();
    await expect(cards(page)).toHaveCount(TOTAL_RECORDS);
    await expect(loading).toHaveCount(0);
    const real = (await cards(page).first().boundingBox())!;
    expect(Math.abs(real.width - skeleton.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(real.x - skeleton.x)).toBeLessThanOrEqual(1);
  });

  test('empty results offer to clear filters', async ({ page }) => {
    await gotoBrowse(page, '/?q=zzzz&sort=newest');

    await expect(
      page.getByRole('heading', { name: 'No records match your filters' }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(cards(page)).toHaveCount(TOTAL_RECORDS);
    await expect(sortSelect(page)).toHaveValue('newest');
  });

  test('a load error shows a message and retry recovers', async ({ page }) => {
    let calls = 0;
    await page.route(RECORDS_URL, (route) =>
      ++calls === 1 ? route.fulfill({ status: 500, body: 'boom' }) : route.continue(),
    );
    await page.goto('/');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('We couldn’t load the records');
    await alert.getByRole('button', { name: 'Retry' }).click();

    await expect(cards(page)).toHaveCount(TOTAL_RECORDS);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(calls).toBe(2);
  });
});

test.describe('cart', () => {
  test('adding updates the header count and confirms with a toast', async ({ page }) => {
    await gotoBrowse(page);
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 0 items');

    await card(page, 'Abbey Road').getByRole('button', { name: 'Add Abbey Road to cart' }).click();
    await expect(toast(page)).toHaveText('Added Abbey Road to your cart');
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 1 item');

    await card(page, 'Ramones').getByRole('button', { name: 'Add Ramones to cart' }).click();
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 2 items');
    await expect(page.getByTestId('cart-count')).toHaveText('2');
  });

  test('cards count down the units left as they are added', async ({ page }) => {
    await gotoBrowse(page);
    const abbeyRoad = card(page, 'Abbey Road');

    await abbeyRoad.getByRole('button', { name: 'Add Abbey Road to cart' }).click();
    await expect(abbeyRoad).toContainText('Only 1 left');

    await abbeyRoad.getByRole('button', { name: 'Add Abbey Road to cart' }).click();
    const soldOut = abbeyRoad.getByRole('button', { name: 'Abbey Road: sold out' });
    await expect(soldOut).toHaveAttribute('aria-disabled', 'true');
    await expect(abbeyRoad).not.toContainText('left');

    const panel = await openCart(page);
    await panel.getByRole('button', { name: 'Remove Abbey Road' }).click();
    await page.keyboard.press('Escape');
    await expect(abbeyRoad).toContainText('Only 2 left');
  });

  test('cannot exceed stock and rejects sold-out records', async ({ page }) => {
    await gotoBrowse(page);
    const pleasures = card(page, 'Unknown Pleasures');

    await pleasures.getByRole('button', { name: 'Add Unknown Pleasures to cart' }).click();
    // aria-disabled keeps the button focusable; Playwright treats it as disabled, so force the click.
    await pleasures
      .getByRole('button', { name: 'Unknown Pleasures: sold out' })
      .click({ force: true });
    await expect(toast(page)).toHaveText('Only 1 of Unknown Pleasures in stock');
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 1 item');

    await card(page, 'Rumours')
      .getByRole('button', { name: 'Rumours: sold out' })
      .click({ force: true });
    await expect(toast(page)).toHaveText('Rumours is sold out');
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 1 item');
  });

  test('the panel lists items with quantities, limits and a subtotal', async ({ page }) => {
    await gotoBrowse(page);
    await card(page, 'Abbey Road').getByRole('button', { name: /^Add/ }).click();
    await card(page, 'Ramones').getByRole('button', { name: /^Add/ }).click();

    const panel = await openCart(page);
    await expect(panel.getByTestId('cart-line')).toHaveCount(2);
    await expect(panel.getByTestId('subtotal')).toHaveText(/^52,98\s€$/);

    // Abbey Road has 2 units: + stops there.
    const increase = panel.getByRole('button', { name: 'Increase quantity of Abbey Road' });
    await increase.click();
    await expect(panel.getByRole('status', { name: 'Quantity of Abbey Road' })).toHaveText('2');
    await expect(increase).toBeDisabled();
    await expect(panel).toContainText('Max 2 in stock');
    await expect(panel.getByTestId('subtotal')).toHaveText(/^82,97\s€$/);

    await panel.getByRole('button', { name: 'Remove Ramones' }).click();
    await expect(panel.getByTestId('cart-line')).toHaveCount(1);
    await expect(panel.getByTestId('subtotal')).toHaveText(/^59,98\s€$/);

    await panel.getByRole('button', { name: 'Decrease quantity of Abbey Road' }).click();
    await panel.getByRole('button', { name: 'Decrease quantity of Abbey Road' }).click();
    await expect(panel).toContainText('Your cart is empty.');
    await expect(panel.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  test('checkout is disabled for the demo', async ({ page }) => {
    await gotoBrowse(page);
    await card(page, 'Ramones').getByRole('button', { name: /^Add/ }).click();

    const panel = await openCart(page);
    await panel.getByRole('button', { name: 'Checkout' }).click();

    await expect(toast(page)).toHaveText('Demo only — checkout disabled.');
    await expect(panel).toBeVisible();
  });

  test('the cart is held in memory only', async ({ page }) => {
    await gotoBrowse(page);
    await card(page, 'Ramones').getByRole('button', { name: /^Add/ }).click();
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 1 item');

    await page.reload();
    await expect(cartButton(page)).toHaveAccessibleName('Cart, 0 items');
  });
});

test.describe('accessibility', () => {
  const scan = (page: Page) =>
    new AxeBuilder({ page })
      .include('header')
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

  test('the browse page passes axe', async ({ page }) => {
    await gotoBrowse(page);
    const { violations } = await scan(page).analyze();
    expect(violations).toEqual([]);
  });

  test('the empty state passes axe', async ({ page }) => {
    await gotoBrowse(page, '/?q=zzzz');
    const { violations } = await scan(page).analyze();
    expect(violations).toEqual([]);
  });

  test('the open cart passes axe', async ({ page }) => {
    await gotoBrowse(page);
    await card(page, 'Ramones').getByRole('button', { name: /^Add/ }).click();
    await openCart(page);

    const { violations } = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations).toEqual([]);
  });

  test('the cart panel works from the keyboard', async ({ page }) => {
    await gotoBrowse(page);
    await cartButton(page).focus();

    await page.keyboard.press('Enter');
    const panel = cartPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(cartButton(page)).toBeFocused();
  });
});
