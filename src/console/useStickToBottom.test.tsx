import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeLayout } from '@/test/fakeLayout';
import { ConsoleProvider } from './ConsoleContext';
import { ConsoleEntryList } from './ConsoleEntryList';
import { createLogger } from './logger';
import type { Logger } from './types';

// Fake layout: every row is 20px, an open row is 120px, the visible list is 100px tall.
const ROW = 20;
const VIEWPORT = 100;

function renderList(logger: Logger) {
  render(
    <ConsoleProvider logger={logger}>
      <ConsoleEntryList />
    </ConsoleProvider>,
  );
  return screen.getByRole('log');
}

function addEntries(logger: Logger, from: number, count: number) {
  for (let i = from; i < from + count; i++) logger.info(`entry ${i}`, { i });
}

function scrollTo(log: HTMLElement, top: number) {
  act(() => {
    log.scrollTop = top;
    fireEvent.scroll(log);
  });
}

const bottomOf = (log: HTMLElement) => log.scrollHeight - log.clientHeight;
const jumpButton = () => screen.queryByRole('button', { name: /\d+ new/i });
const rowByMessage = (message: string) =>
  screen.getAllByTestId('console-entry').find((row) => row.textContent?.includes(message));

describe('useStickToBottom (through ConsoleEntryList)', () => {
  let restoreLayout: () => void;

  beforeEach(() => {
    restoreLayout = installFakeLayout({
      rowHeight: ROW,
      expandedExtra: 100,
      viewportHeight: VIEWPORT,
    });
  });
  afterEach(() => restoreLayout());

  it('starts at the bottom', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);

    const log = renderList(logger);

    expect(log.scrollTop).toBe(20 * ROW - VIEWPORT);
  });

  it('at the bottom, a new entry scrolls the list down', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    act(() => {
      addEntries(logger, 20, 1);
    });

    expect(log.scrollTop).toBe(bottomOf(log));
    expect(log.scrollTop).toBe(21 * ROW - VIEWPORT);
    expect(jumpButton()).not.toBeInTheDocument();
  });

  it('counts as at the bottom within 24px of it', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, bottomOf(log) - 24);
    act(() => {
      addEntries(logger, 20, 1);
    });

    expect(log.scrollTop).toBe(bottomOf(log));
    expect(jumpButton()).not.toBeInTheDocument();
  });

  it('scrolled up, a new entry leaves scrollTop unchanged and shows "↓ N new"', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, 100);
    act(() => {
      addEntries(logger, 20, 1);
    });

    expect(log.scrollTop).toBe(100);
    expect(jumpButton()).toHaveTextContent(/↓\s*1 new/);

    act(() => {
      addEntries(logger, 21, 2);
    });

    expect(log.scrollTop).toBe(100);
    expect(jumpButton()).toHaveTextContent(/↓\s*3 new/);
  });

  it('just outside the 24px threshold counts as scrolled up', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, bottomOf(log) - 25);
    const before = log.scrollTop;
    act(() => {
      addEntries(logger, 20, 1);
    });

    expect(log.scrollTop).toBe(before);
    expect(jumpButton()).toBeInTheDocument();
  });

  it('keeps the first visible row in place when the buffer drops old entries', () => {
    const logger = createLogger({ maxEntries: 30 });
    addEntries(logger, 0, 30);
    const log = renderList(logger);

    // Row "entry 10" is the first visible row.
    scrollTo(log, 10 * ROW);
    const anchor = rowByMessage('entry 10');
    expect(anchor?.getBoundingClientRect().top).toBe(0);

    act(() => {
      addEntries(logger, 30, 5);
    });

    expect(screen.queryByText('entry 0')).not.toBeInTheDocument();
    const anchorAfter = rowByMessage('entry 10');
    expect(anchorAfter?.getBoundingClientRect().top).toBe(0);
    expect(log.scrollTop).toBe(5 * ROW);
    expect(jumpButton()).toHaveTextContent(/5 new/);
  });

  it('keeps the first visible row in place when open rows above it are dropped', async () => {
    const user = userEvent.setup();
    const logger = createLogger({ maxEntries: 30 });
    addEntries(logger, 0, 30);
    const log = renderList(logger);

    scrollTo(log, 0);
    const first = rowByMessage('entry 0')?.querySelector<HTMLElement>('button[aria-expanded]');
    if (!first) throw new Error('missing row');
    await user.click(first); // entry 0 is now 120px tall
    scrollTo(log, 100 + 10 * ROW); // entry 10 at the top
    expect(rowByMessage('entry 10')?.getBoundingClientRect().top).toBe(0);

    act(() => {
      addEntries(logger, 30, 2);
    });

    expect(rowByMessage('entry 10')?.getBoundingClientRect().top).toBe(0);
  });

  it('opening or closing a row never scrolls, scrolled up or at the bottom', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, 100);
    const visible = rowByMessage('entry 6')?.querySelector<HTMLElement>('button[aria-expanded]');
    if (!visible) throw new Error('missing row');
    await user.click(visible);
    expect(log.scrollTop).toBe(100);
    await user.click(visible);
    expect(log.scrollTop).toBe(100);

    scrollTo(log, bottomOf(log));
    const atBottom = log.scrollTop;
    const last = rowByMessage('entry 19')?.querySelector<HTMLElement>('button[aria-expanded]');
    if (!last) throw new Error('missing row');
    await user.click(last);

    expect(log.scrollTop).toBe(atBottom);
    expect(jumpButton()).not.toBeInTheDocument();
  });

  it('clicking "↓ N new" jumps to the bottom, hides the button and turns auto-scroll back on', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, 0);
    act(() => {
      addEntries(logger, 20, 3);
    });
    const button = jumpButton();
    expect(button).toHaveTextContent(/3 new/);

    await user.click(button!);

    expect(log.scrollTop).toBe(bottomOf(log));
    expect(jumpButton()).not.toBeInTheDocument();

    act(() => {
      addEntries(logger, 23, 1);
    });
    expect(log.scrollTop).toBe(bottomOf(log));
    expect(jumpButton()).not.toBeInTheDocument();
  });

  it('scrolling to the bottom by hand hides the button and turns auto-scroll back on', () => {
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, 0);
    act(() => {
      addEntries(logger, 20, 2);
    });
    expect(jumpButton()).toBeInTheDocument();

    scrollTo(log, bottomOf(log));
    expect(jumpButton()).not.toBeInTheDocument();

    act(() => {
      addEntries(logger, 22, 1);
    });
    expect(log.scrollTop).toBe(bottomOf(log));
    expect(jumpButton()).not.toBeInTheDocument();
  });

  it('Clear hides the "N new" button', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    addEntries(logger, 0, 20);
    const log = renderList(logger);

    scrollTo(log, 0);
    act(() => {
      addEntries(logger, 20, 2);
    });
    expect(jumpButton()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^clear$/i }));

    expect(jumpButton()).not.toBeInTheDocument();
  });
});
