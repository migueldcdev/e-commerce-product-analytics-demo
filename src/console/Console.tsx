import { PanelBottom, PanelLeft, PanelRight, PanelTop, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConsoleEntryList } from './ConsoleEntryList';
import { isVertical, useConsoleLayout, type Dock } from './useConsoleLayout';

const COLLAPSED_PX = 28;
const KEY_STEP = 10;
const KEY_STEP_LARGE = 50;

// The app comes first in the DOM; the flex direction puts the console on the docked side.
// The panel uses the same direction, so its resize handle always faces the app.
const FLEX_DIRECTION: Record<Dock, CSSProperties['flexDirection']> = {
  bottom: 'column',
  top: 'column-reverse',
  right: 'row',
  left: 'row-reverse',
};
const GROW_KEY: Record<Dock, string> = {
  bottom: 'ArrowUp',
  top: 'ArrowDown',
  left: 'ArrowRight',
  right: 'ArrowLeft',
};
const SHRINK_KEY: Record<Dock, string> = {
  bottom: 'ArrowDown',
  top: 'ArrowUp',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};
const DOCK_OPTIONS: { dock: Dock; label: string; Icon: typeof PanelLeft }[] = [
  { dock: 'right', label: 'Right', Icon: PanelRight },
  { dock: 'top', label: 'Top', Icon: PanelTop },
  { dock: 'left', label: 'Left', Icon: PanelLeft },
  { dock: 'bottom', label: 'Bottom', Icon: PanelBottom },
];

const ICON_BUTTON =
  'inline-flex size-6 items-center justify-center rounded-sm text-zinc-700 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-foreground [&_svg]:size-3.5';

const TABBABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isToggleShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && (event.key === '`' || event.code === 'Backquote');
}

/**
 * The console panel and the app next to it. Desktop: docked, resizable, collapsible.
 * Mobile: a tab at the top that opens the console full screen.
 */
export function Console({ children }: { children: ReactNode }) {
  const layout = useConsoleLayout();
  const { isMobile, dock, toggle } = layout;

  useEffect(() => {
    if (isMobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isToggleShortcut(event)) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, toggle]);

  return (
    <div
      className={isMobile ? 'min-h-svh pt-9' : 'flex h-svh w-full overflow-hidden'}
      style={isMobile ? undefined : { flexDirection: FLEX_DIRECTION[dock] }}
    >
      {/* Always the first child, so switching layouts never remounts the app. */}
      <div
        className={
          isMobile ? 'min-h-[calc(100svh-2.25rem)]' : 'min-h-0 min-w-0 flex-1 overflow-auto'
        }
      >
        {children}
      </div>
      {isMobile ? <MobileConsole /> : <DesktopConsole layout={layout} />}
    </div>
  );
}

type Layout = ReturnType<typeof useConsoleLayout>;

function DesktopConsole({ layout }: { layout: Layout }) {
  const { dock, sizePx, open, setOpen } = layout;
  const vertical = isVertical(dock);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const restoreFocus = useRef(false);

  // When the user collapses or expands from inside the panel, keep focus in the panel.
  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    (open ? closeRef : openRef).current?.focus();
  }, [open]);

  const setOpenKeepingFocus = (next: boolean) => {
    restoreFocus.current = !!sectionRef.current?.contains(document.activeElement);
    setOpen(next);
  };

  const extent = open ? sizePx : COLLAPSED_PX;

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label="Console"
      className="ph-no-capture flex shrink-0 overflow-hidden bg-background text-foreground"
      style={{ flexDirection: FLEX_DIRECTION[dock], [vertical ? 'width' : 'height']: extent }}
    >
      {open ? (
        <>
          <ResizeHandle layout={layout} />
          <div className="min-h-0 min-w-0 flex-1">
            <ConsoleEntryList
              toolbar={
                <>
                  <DockMenu dock={dock} onChange={layout.setDock} />
                  <button
                    ref={closeRef}
                    type="button"
                    aria-label="Close console"
                    title="Close console (Ctrl/Cmd + `)"
                    onClick={() => setOpenKeepingFocus(false)}
                    className={ICON_BUTTON}
                  >
                    <X aria-hidden="true" />
                  </button>
                </>
              }
            />
          </div>
        </>
      ) : (
        <button
          ref={openRef}
          type="button"
          title="Open console (Ctrl/Cmd + `)"
          onClick={() => setOpenKeepingFocus(true)}
          className={`flex h-full w-full items-center gap-2 border-border px-2 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
            vertical ? 'justify-center [writing-mode:vertical-rl]' : ''
          } ${{ bottom: 'border-t', top: 'border-b', left: 'border-r', right: 'border-l' }[dock]}`}
        >
          Open console
        </button>
      )}
    </section>
  );
}

function isDock(value: string): value is Dock {
  return DOCK_OPTIONS.some((option) => option.dock === value);
}

/** Picks the side the console docks to. */
function DockMenu({ dock, onChange }: { dock: Dock; onChange: (dock: Dock) => void }) {
  const current = DOCK_OPTIONS.find((option) => option.dock === dock) ?? DOCK_OPTIONS[3];
  const CurrentIcon = current.Icon;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Console position: ${current.label}`}
        title="Console position"
        className={ICON_BUTTON}
      >
        <CurrentIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      {/* Portalled out of the panel, so it needs its own autocapture opt-out. */}
      <DropdownMenuContent align="end" className="ph-no-capture w-auto">
        <DropdownMenuLabel>Console position</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={dock}
          onValueChange={(value) => {
            if (isDock(value)) onChange(value);
          }}
        >
          {DOCK_OPTIONS.map(({ dock: side, label, Icon }) => (
            <DropdownMenuRadioItem key={side} value={side}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResizeHandle({ layout }: { layout: Layout }) {
  const { dock, sizePx, minPx, maxPx, setSizePx, resetSize } = layout;
  const vertical = isVertical(dock);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDrag.current?.(), []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      stopDrag.current?.();
      const start = vertical ? event.clientX : event.clientY;
      // Moving toward the app grows the panel.
      const sign = dock === 'bottom' || dock === 'right' ? -1 : 1;
      const startPx = sizePx;
      const body = document.body.style;
      const previousUserSelect = body.userSelect;
      body.userSelect = 'none';

      const onMove = (move: PointerEvent) => {
        const position = vertical ? move.clientX : move.clientY;
        setSizePx(startPx + sign * (position - start));
      };
      const stop = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        body.userSelect = previousUserSelect;
        stopDrag.current = null;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      stopDrag.current = stop;
    },
    [dock, sizePx, setSizePx, vertical],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    if (event.key === GROW_KEY[dock]) setSizePx(sizePx + step);
    else if (event.key === SHRINK_KEY[dock]) setSizePx(sizePx - step);
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label="Resize console"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={sizePx}
      aria-valuemin={minPx}
      aria-valuemax={maxPx}
      onPointerDown={onPointerDown}
      onDoubleClick={resetSize}
      onKeyDown={onKeyDown}
      className={`shrink-0 touch-none bg-border outline-none hover:bg-ring focus-visible:bg-ring focus-visible:ring-2 focus-visible:ring-ring ${
        vertical ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
    />
  );
}

function MobileConsole() {
  const [open, setOpen] = useState(false);
  const tabRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Focus moves into the dialog on open and back to the tab on close.
  useEffect(() => {
    if (open) closeRef.current?.focus();
    else if (wasOpen.current) tabRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Lock page scroll, and let the browser back button close the console.
  useEffect(() => {
    if (!open) return;
    const body = document.body.style;
    const previousOverflow = body.overflow;
    body.overflow = 'hidden';
    const onPopState = () => setOpen(false);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      body.overflow = previousOverflow;
    };
  }, [open]);

  const openConsole = () => {
    try {
      const state: unknown = window.history.state;
      const base = typeof state === 'object' && state !== null ? state : {};
      window.history.pushState({ ...base, consoleOpen: true }, '');
    } catch {
      // History can be unavailable (sandboxed frames); the console still opens.
    }
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    const state: unknown = window.history.state;
    if (typeof state === 'object' && state !== null && 'consoleOpen' in state)
      window.history.back();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(TABBABLE));
    const first = items[0];
    const last = items.at(-1);
    const active = document.activeElement;
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        aria-haspopup="dialog"
        onClick={openConsole}
        className="ph-no-capture fixed inset-x-0 top-0 z-40 h-9 border-b border-border bg-background text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        Console
      </button>
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Console"
          onKeyDown={onKeyDown}
          className="ph-no-capture fixed inset-0 z-50 flex flex-col overscroll-contain bg-background text-foreground"
        >
          <ConsoleEntryList
            toolbar={
              <button
                ref={closeRef}
                type="button"
                aria-label="Close console"
                onClick={close}
                className={ICON_BUTTON}
              >
                <X aria-hidden="true" />
              </button>
            }
          />
        </div>
      )}
    </>
  );
}
