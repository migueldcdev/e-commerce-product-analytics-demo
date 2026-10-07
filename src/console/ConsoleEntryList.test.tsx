import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleProvider } from './ConsoleContext';
import { ConsoleEntryList } from './ConsoleEntryList';
import { createLogger } from './logger';
import type { Logger } from './types';

function renderList(logger: Logger = createLogger()) {
  render(
    <ConsoleProvider logger={logger}>
      <ConsoleEntryList />
    </ConsoleProvider>,
  );
  return logger;
}

const rows = () => screen.queryAllByTestId('console-entry');
function rowHeader(row: HTMLElement): HTMLElement {
  const button = row.querySelector<HTMLElement>('button[aria-expanded]');
  if (!button) throw new Error('row has no expandable header');
  return button;
}

function detailsOf(button: HTMLElement): HTMLElement | null {
  const id = button.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

const PAGEVIEW = {
  $os: 'Windows',
  $browser: 'Brave',
  $current_url: 'http://localhost:5173/',
  $pathname: '/',
  $viewport_width: 1106,
  $browser_version: null,
  demo_generated: false,
};

describe('ConsoleEntryList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 18, 4, 12, 381));
  });
  afterEach(() => vi.useRealTimers());

  it('shows the empty state when there are no entries', () => {
    renderList();

    expect(screen.getByText('No logs yet')).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
    expect(screen.getByText(/0 entries/i)).toBeInTheDocument();
  });

  it('is a role="log" list with aria-live off', () => {
    renderList();
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'off');
  });

  it('shows rows oldest first in the "▸ time · LEVEL · source · summary" format', () => {
    const logger = createLogger();
    const posthog = logger.scope('posthog');
    posthog.info('$pageview  /', PAGEVIEW);
    vi.setSystemTime(new Date(2026, 9, 7, 18, 4, 15, 902));
    posthog.info('$autocapture  click  button "Generate demo"', { $event_type: 'click' });
    vi.setSystemTime(new Date(2026, 9, 7, 9, 5, 7, 9));
    logger.warn('app warning', { a: 1 });

    renderList(logger);

    const [first, second, third] = rows();
    expect(rows()).toHaveLength(3);
    expect(rowHeader(first)).toHaveTextContent(
      /^▸\s*18:04:12\.381\W*INFO\W*posthog\W*\$pageview \/$/,
    );
    expect(rowHeader(second)).toHaveTextContent(
      /^▸\s*18:04:15\.902\W*INFO\W*posthog\W*\$autocapture click button "Generate demo"$/,
    );
    expect(rowHeader(third)).toHaveTextContent(/^▸\s*09:05:07\.009\W*WARN\W*app\W*app warning$/);
    expect(screen.getByText(/3 entries/i)).toBeInTheDocument();
  });

  it('shows each level as text with its own colour', () => {
    const logger = createLogger();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    renderList(logger);

    const classes = ['DEBUG', 'INFO', 'WARN', 'ERROR'].map((level) => {
      const element = within(screen.getByRole('log')).getByText(level);
      return element.className;
    });
    expect(new Set(classes).size).toBe(4);
  });

  describe('expanding rows', () => {
    it('opens and closes a row by click, updating aria-expanded and the arrow', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.scope('posthog').info('$pageview  /', PAGEVIEW);
      renderList(logger);
      const button = rowHeader(rows()[0]);

      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(detailsOf(button)).toBeNull();
      expect(screen.queryByText(/"\$os"/)).not.toBeInTheDocument();

      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveTextContent(/^▾/);
      const details = detailsOf(button);
      expect(details).not.toBeNull();
      expect(details).toHaveTextContent('"$pathname"');
      expect(details).toHaveTextContent('"Windows"');

      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveTextContent(/^▸/);
      expect(detailsOf(button)).toBeNull();
    });

    it('opens and closes a row with Enter and Space', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('keyboard', { a: 1 });
      renderList(logger);
      const button = rowHeader(rows()[0]);

      button.focus();
      await user.keyboard('{Enter}');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard('{Enter}');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      await user.keyboard(' ');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard(' ');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('lets several rows be open at the same time', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('one', { n: 1 });
      logger.info('two', { n: 2 });
      logger.info('three', { n: 3 });
      renderList(logger);
      const [first, , third] = rows().map(rowHeader);

      await user.click(first);
      await user.click(third);

      expect(first).toHaveAttribute('aria-expanded', 'true');
      expect(third).toHaveAttribute('aria-expanded', 'true');
      expect(rowHeader(rows()[1])).toHaveAttribute('aria-expanded', 'false');
    });

    it('a row without data shows no arrow and cannot be expanded', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('no data here');
      renderList(logger);
      const [row] = rows();

      expect(row.querySelector('[aria-expanded]')).toBeNull();
      expect(row).not.toHaveTextContent('▸');
      expect(row).toHaveTextContent('no data here');

      await user.click(within(row).getByText('no data here'));

      expect(row.querySelector('[aria-expanded]')).toBeNull();
      expect(row).not.toHaveTextContent('▾');
    });

    it('keeps an open row open when new entries arrive', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('first', { n: 1 });
      renderList(logger);
      await user.click(rowHeader(rows()[0]));

      act(() => {
        logger.info('second', { n: 2 });
        logger.info('third', { n: 3 });
      });

      expect(rowHeader(rows()[0])).toHaveAttribute('aria-expanded', 'true');
      expect(rowHeader(rows()[1])).toHaveAttribute('aria-expanded', 'false');
      expect(rowHeader(rows()[2])).toHaveAttribute('aria-expanded', 'false');
    });

    it('drops the open state of an entry that leaves the buffer', async () => {
      const user = userEvent.setup();
      const logger = createLogger({ maxEntries: 2 });
      logger.info('oldest', { n: 1 });
      logger.info('middle', { n: 2 });
      renderList(logger);
      await user.click(rowHeader(rows()[0]));
      expect(screen.getByText('"n"')).toBeInTheDocument();

      act(() => {
        logger.info('newest', { n: 3 });
      });

      expect(rows()).toHaveLength(2);
      expect(screen.queryByText('oldest')).not.toBeInTheDocument();
      for (const row of rows()) expect(rowHeader(row)).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('"n"')).not.toBeInTheDocument();
    });

    it('wires aria-controls to the details block', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('a', { a: 1 });
      logger.info('b', { b: 2 });
      renderList(logger);
      const [first, second] = rows().map(rowHeader);

      await user.click(first);
      await user.click(second);

      const firstId = first.getAttribute('aria-controls');
      const secondId = second.getAttribute('aria-controls');
      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
      expect(firstId).not.toBe(secondId);
      expect(detailsOf(first)).toHaveTextContent('"a"');
      expect(detailsOf(second)).toHaveTextContent('"b"');
    });
  });

  describe('Copy JSON', () => {
    it('copies the whole data formatted with 2 spaces and shows "Copied"', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      const data = { ...PAGEVIEW, $elements: [{ tag_name: 'button', nested: { deep: true } }] };
      logger.scope('posthog').info('$pageview  /', data);
      renderList(logger);
      const [row] = rows();

      expect(within(row).queryByRole('button', { name: /copy json/i })).not.toBeInTheDocument();
      await user.click(rowHeader(row));
      await user.click(within(row).getByRole('button', { name: /copy json/i }));

      expect(await navigator.clipboard.readText()).toBe(JSON.stringify(data, null, 2));
      expect(within(row).getByText(/copied/i)).toBeInTheDocument();
    });
  });

  describe('Clear', () => {
    it('empties the list, resets the count and closes all rows', async () => {
      const user = userEvent.setup();
      const logger = createLogger();
      logger.info('one', { n: 1 });
      logger.info('two', { n: 2 });
      renderList(logger);
      await user.click(rowHeader(rows()[0]));
      expect(screen.getByText(/2 entries/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^clear$/i }));

      expect(rows()).toHaveLength(0);
      expect(screen.getByText('No logs yet')).toBeInTheDocument();
      expect(screen.getByText(/0 entries/i)).toBeInTheDocument();
      expect(logger.getSnapshot().logs).toHaveLength(0);

      act(() => {
        logger.info('after clear', { n: 3 });
      });

      expect(rowHeader(rows()[0])).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByText(/1 entry\b/i)).toBeInTheDocument();
    });
  });
});
