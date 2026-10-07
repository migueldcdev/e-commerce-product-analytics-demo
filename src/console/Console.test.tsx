import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setViewport } from '@/test/viewport';
import { Console } from './Console';
import { ConsoleProvider } from './ConsoleContext';
import { createLogger } from './logger';
import type { Logger } from './types';

// Desktop tests run at 1280x800, so the default bottom dock is 30% of 800 = 240px,
// the max is 80% of 800 = 640px, and a left/right dock at 30% is 384px of 1280.
const STORAGE_KEY = 'console.layout';

function renderConsole(logger: Logger = createLogger()) {
  render(
    <ConsoleProvider logger={logger}>
      <Console>
        <button type="button">App button</button>
        <p>App content</p>
      </Console>
    </ConsoleProvider>,
  );
  return logger;
}

const region = () => screen.getByRole('region', { name: 'Console' });
const separator = () => screen.getByRole('separator');
const size = () => Number(separator().getAttribute('aria-valuenow'));
const positionMenu = () => screen.getByRole('button', { name: /console position/i });
const capitalise = (side: string) => side[0].toUpperCase() + side.slice(1);

/** The trigger names the current dock, e.g. "Console position: Bottom". */
function expectDock(side: string) {
  expect(positionMenu()).toHaveAccessibleName(`Console position: ${capitalise(side)}`);
}

async function chooseDock(user: ReturnType<typeof userEvent.setup>, side: string) {
  await user.click(positionMenu());
  await user.click(screen.getByRole('menuitemradio', { name: capitalise(side) }));
}
const savedLayout = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Record<string, unknown>;

function pointer(
  type: 'pointerDown' | 'pointerMove' | 'pointerUp',
  target: Element,
  x: number,
  y: number,
) {
  fireEvent[type](target, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y,
  });
}

function drag(target: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  pointer('pointerDown', target, from.x, from.y);
  pointer('pointerMove', target, to.x, to.y);
  pointer('pointerUp', target, to.x, to.y);
}

beforeAll(() => {
  // jsdom has no pointer capture.
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
});

describe('Console (desktop, ≥ 768px)', () => {
  it('renders the app content next to an open console region', () => {
    renderConsole();

    expect(screen.getByText('App content')).toBeInTheDocument();
    expect(region()).toBeInTheDocument();
    expect(within(region()).getByRole('log')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close console/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is excluded from PostHog autocapture', () => {
    renderConsole();
    expect(region()).toHaveClass('ph-no-capture');
  });

  it('starts docked at the bottom at 30%', () => {
    renderConsole();

    expectDock('bottom');
    expect(size()).toBe(240);
    expect(separator()).toHaveAttribute('aria-valuemin', '120');
    expect(separator()).toHaveAttribute('aria-valuemax', '640');
    expect(separator()).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator()).toHaveAttribute('tabindex', '0');
  });

  it('starts open even when the saved state says it was closed', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dock: 'bottom', size: 30, open: false }));
    renderConsole();

    expect(region()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close console/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open console/i })).not.toBeInTheDocument();
  });

  describe('docking', () => {
    it('offers the four positions in a dropdown with icons, the current one checked', async () => {
      const user = userEvent.setup();
      renderConsole();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await user.click(positionMenu());

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('ph-no-capture');
      const items = within(menu).getAllByRole('menuitemradio');
      expect(items.map((item) => item.textContent)).toEqual(['Right', 'Top', 'Left', 'Bottom']);
      for (const item of items) expect(item.querySelector('svg')).not.toBeNull();
      expect(within(menu).getByRole('menuitemradio', { name: 'Bottom' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(within(menu).getByRole('menuitemradio', { name: 'Left' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('works from the keyboard', async () => {
      const user = userEvent.setup();
      renderConsole();
      positionMenu().focus();

      await user.keyboard('{Enter}');
      await user.keyboard('{ArrowDown}');
      const focused = document.activeElement;
      expect(focused).toHaveAttribute('role', 'menuitemradio');
      await user.keyboard('{Enter}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(positionMenu()).toHaveAccessibleName(`Console position: ${focused?.textContent}`);
    });

    it.each([
      ['left', 384, 1024, 'vertical'],
      ['right', 384, 1024, 'vertical'],
      ['top', 240, 640, 'horizontal'],
      ['bottom', 240, 640, 'horizontal'],
    ])(
      'docks to the %s and keeps the size as a percentage',
      async (side, now, max, orientation) => {
        const user = userEvent.setup();
        renderConsole();
        if (side === 'bottom') await chooseDock(user, 'top');

        await chooseDock(user, side);

        expectDock(side);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(size()).toBe(now);
        expect(separator()).toHaveAttribute('aria-valuemax', String(max));
        expect(separator()).toHaveAttribute('aria-orientation', orientation);
        expect(savedLayout()).toMatchObject({ dock: side });
      },
    );

    it('converts a resized size to the same percentage along the new axis', async () => {
      const user = userEvent.setup();
      renderConsole();
      drag(separator(), { x: 640, y: 560 }, { x: 640, y: 400 }); // 400px = 50% of 800

      await chooseDock(user, 'left');

      expect(size()).toBe(640); // 50% of 1280
    });
  });

  describe('resizing', () => {
    it('drags the handle to resize, within 120px and 80%', () => {
      renderConsole();
      const handle = separator();

      pointer('pointerDown', handle, 640, 560);
      pointer('pointerMove', handle, 640, 460);
      expect(size()).toBe(340);

      pointer('pointerMove', handle, 640, 0);
      expect(size()).toBe(640);

      pointer('pointerMove', handle, 640, 795);
      expect(size()).toBe(120);

      pointer('pointerUp', handle, 640, 795);
      pointer('pointerMove', handle, 640, 300);
      expect(size()).toBe(120);
    });

    it.each([
      ['left', { x: 384, y: 400 }, { x: 500, y: 400 }],
      ['right', { x: 896, y: 400 }, { x: 780, y: 400 }],
      ['top', { x: 640, y: 240 }, { x: 640, y: 500 }],
    ])('drags along the right axis when docked %s', async (side, from, to) => {
      const user = userEvent.setup();
      renderConsole();
      await chooseDock(user, side);

      drag(separator(), from, to);

      expect(size()).toBe(500);
    });

    it('turns text selection off while dragging', () => {
      renderConsole();
      const handle = separator();

      pointer('pointerDown', handle, 640, 560);
      pointer('pointerMove', handle, 640, 500);
      expect(document.body.style.userSelect).toBe('none');

      pointer('pointerUp', handle, 640, 500);
      expect(document.body.style.userSelect).not.toBe('none');
    });

    it('resets to the default size on double-click', () => {
      renderConsole();
      drag(separator(), { x: 640, y: 560 }, { x: 640, y: 300 });
      expect(size()).toBe(500);

      fireEvent.doubleClick(separator());

      expect(size()).toBe(240);
    });

    it('resizes from the keyboard in 10px steps, 50px with Shift', async () => {
      const user = userEvent.setup();
      renderConsole();
      separator().focus();

      await user.keyboard('{ArrowUp}');
      expect(size()).toBe(250);
      await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
      expect(size()).toBe(300);
      await user.keyboard('{ArrowDown}');
      expect(size()).toBe(290);
      await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
      expect(size()).toBe(240);
    });

    it.each([
      ['left', '{ArrowRight}', '{ArrowLeft}'],
      ['right', '{ArrowLeft}', '{ArrowRight}'],
      ['top', '{ArrowDown}', '{ArrowUp}'],
    ])('keyboard resizing follows the %s dock', async (side, grow, shrink) => {
      const user = userEvent.setup();
      renderConsole();
      await chooseDock(user, side);
      const start = size();
      separator().focus();

      await user.keyboard(grow);
      expect(size()).toBe(start + 10);
      await user.keyboard(shrink);
      await user.keyboard(shrink);
      expect(size()).toBe(start - 10);
    });

    it('keyboard resizing stops at the limits', async () => {
      const user = userEvent.setup();
      renderConsole();
      separator().focus();

      for (let i = 0; i < 10; i++) await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
      expect(size()).toBe(120);

      for (let i = 0; i < 20; i++) await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
      expect(size()).toBe(640);
    });
  });

  describe('persistence', () => {
    it('saves dock and size, but not whether it is open', async () => {
      const user = userEvent.setup();
      renderConsole();

      await chooseDock(user, 'left');
      drag(separator(), { x: 384, y: 400 }, { x: 640, y: 400 });
      await user.click(screen.getByRole('button', { name: /close console/i }));

      const saved = savedLayout();
      expect(saved.dock).toBe('left');
      expect(saved.size).toBeCloseTo(50); // percent of the viewport along the dock axis
      expect(saved).not.toHaveProperty('open');
    });

    it('restores dock and size from storage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dock: 'right', size: 25 }));
      renderConsole();

      expectDock('right');
      expect(size()).toBe(320);
    });

    it.each([
      ['not JSON', '{oops'],
      ['null', 'null'],
      ['an array', '[]'],
      ['a number', '42'],
      ['an unknown dock and a bad size', JSON.stringify({ dock: 'diagonal', size: 'big' })],
      ['a negative size', JSON.stringify({ dock: 42, size: -5 })],
    ])('falls back to the defaults when the saved value is %s', (_name, raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      renderConsole();

      expectDock('bottom');
      expect(size()).toBe(240);
    });

    it('falls back per value when only one is invalid', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dock: 'left', size: 'big' }));
      renderConsole();

      expectDock('left');
      expect(size()).toBe(384);
    });

    it('keeps working when localStorage throws', async () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });

      const user = userEvent.setup();
      renderConsole();
      expect(size()).toBe(240);
      await chooseDock(user, 'top');
      expectDock('top');

      getItem.mockRestore();
      setItem.mockRestore();
    });
  });

  describe('open / close', () => {
    it('the close button collapses to a bar, and the bar reopens it at the same size', async () => {
      const user = userEvent.setup();
      renderConsole();
      drag(separator(), { x: 640, y: 560 }, { x: 640, y: 460 });

      await user.click(screen.getByRole('button', { name: /close console/i }));

      expect(screen.queryByRole('log')).not.toBeInTheDocument();
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
      const open = screen.getByRole('button', { name: /open console/i });
      expect(screen.getByText('App content')).toBeInTheDocument();

      await user.click(open);

      expect(screen.getByRole('log')).toBeInTheDocument();
      expect(size()).toBe(340);
    });

    it.each([
      ['Ctrl', { ctrlKey: true }],
      ['Cmd', { metaKey: true }],
    ])('%s + ` toggles the console', (_name, modifier) => {
      renderConsole();
      const press = () =>
        fireEvent.keyDown(document.body, { key: '`', code: 'Backquote', ...modifier });

      act(() => {
        press();
      });
      expect(screen.getByRole('button', { name: /open console/i })).toBeInTheDocument();
      expect(screen.queryByRole('log')).not.toBeInTheDocument();

      act(() => {
        press();
      });
      expect(screen.getByRole('log')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /open console/i })).not.toBeInTheDocument();
    });

    it('a plain ` does not toggle', () => {
      renderConsole();
      fireEvent.keyDown(document.body, { key: '`', code: 'Backquote' });
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('collects entries while collapsed', async () => {
      const user = userEvent.setup();
      const logger = renderConsole();
      await user.click(screen.getByRole('button', { name: /close console/i }));

      act(() => {
        logger.info('while closed', { a: 1 });
      });
      await user.click(screen.getByRole('button', { name: /open console/i }));

      expect(within(screen.getByRole('log')).getByText('while closed')).toBeInTheDocument();
    });
  });

  it('logging does not re-render the layout', () => {
    const logger = createLogger();
    let appRenders = 0;
    function App() {
      appRenders++;
      return <p>App content</p>;
    }
    render(
      <ConsoleProvider logger={logger}>
        <Console>
          <App />
        </Console>
      </ConsoleProvider>,
    );
    const before = appRenders;

    act(() => {
      for (let i = 0; i < 5; i++) logger.info(`entry ${i}`);
    });

    expect(screen.getAllByTestId('console-entry')).toHaveLength(5);
    expect(appRenders).toBe(before);
  });
});

describe('Console (mobile, < 768px)', () => {
  beforeEach(() => setViewport(390, 844));

  const tab = () => screen.getByRole('button', { name: /^console$/i });
  const dialog = () => screen.getByRole('dialog', { name: 'Console' });

  it('shows only the tab at start', () => {
    renderConsole();

    expect(tab()).toBeInTheDocument();
    expect(screen.getByText('App content')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('tapping the tab opens a full-screen modal dialog without docking or resizing', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(tab());

    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(dialog()).toHaveClass('ph-no-capture');
    expect(within(dialog()).getByRole('log')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /console position/i })).not.toBeInTheDocument();
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
  });

  it('the close button closes it and returns focus to the tab', async () => {
    const user = userEvent.setup();
    renderConsole();
    await user.click(tab());

    await user.click(within(dialog()).getByRole('button', { name: /close console/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tab()).toHaveFocus();
  });

  it('Escape closes it and returns focus to the tab', async () => {
    const user = userEvent.setup();
    renderConsole();
    await user.click(tab());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tab()).toHaveFocus();
  });

  it('the browser back button closes it', async () => {
    const user = userEvent.setup();
    renderConsole();
    await user.click(tab());

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tab()).toHaveFocus();
  });

  it('locks page scroll while open', async () => {
    const user = userEvent.setup();
    renderConsole();
    const before = document.body.style.overflow;

    await user.click(tab());
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe(before);
  });

  it('keeps focus inside the console', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    logger.info('row', { a: 1 });
    renderConsole(logger);
    await user.click(tab());

    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog()).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true });
      expect(dialog()).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('shows entries collected while it was closed', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    logger.info('before render');
    renderConsole(logger);
    act(() => {
      logger.info('while closed');
    });

    await user.click(tab());

    const log = within(dialog()).getByRole('log');
    expect(within(log).getByText('before render')).toBeInTheDocument();
    expect(within(log).getByText('while closed')).toBeInTheDocument();
  });
});

describe('Console (crossing the breakpoint)', () => {
  it('switches layout and keeps entries and open rows', async () => {
    const user = userEvent.setup();
    const logger = createLogger();
    logger.info('first', { n: 1 });
    logger.info('second', { n: 2 });
    renderConsole(logger);
    const firstHeader = () =>
      screen.getAllByTestId('console-entry')[0].querySelector('button[aria-expanded]');

    await user.click(firstHeader()!);
    expect(firstHeader()).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      setViewport(390, 844);
    });

    expect(screen.queryByRole('region', { name: 'Console' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^console$/i }));
    expect(screen.getByRole('dialog', { name: 'Console' })).toBeInTheDocument();
    expect(screen.getAllByTestId('console-entry')).toHaveLength(2);
    expect(firstHeader()).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      setViewport(1280, 800);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(region()).toBeInTheDocument();
    expect(screen.getAllByTestId('console-entry')).toHaveLength(2);
    expect(firstHeader()).toHaveAttribute('aria-expanded', 'true');
  });
});
