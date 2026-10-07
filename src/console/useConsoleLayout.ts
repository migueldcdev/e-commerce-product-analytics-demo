import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type Dock = 'left' | 'right' | 'top' | 'bottom';

export const MOBILE_BREAKPOINT = 768;
export const DEFAULT_DOCK: Dock = 'bottom';
/** Percent of the viewport along the dock axis. */
export const DEFAULT_SIZE = 30;
export const MIN_SIZE_PX = 120;
export const MAX_SIZE_RATIO = 0.8;
export const STORAGE_KEY = 'console.layout';

const DOCKS: readonly Dock[] = ['left', 'right', 'top', 'bottom'];

interface SavedLayout {
  dock: Dock;
  size: number;
}

function isDock(value: unknown): value is Dock {
  return typeof value === 'string' && (DOCKS as readonly string[]).includes(value);
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100;
}

/** Reads the saved layout; each missing or invalid value falls back to its default. */
function readLayout(): SavedLayout {
  let saved: unknown;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saved = raw === null ? null : JSON.parse(raw);
  } catch {
    saved = null;
  }
  const record =
    typeof saved === 'object' && saved !== null && !Array.isArray(saved)
      ? (saved as Record<string, unknown>)
      : {};
  return {
    dock: isDock(record.dock) ? record.dock : DEFAULT_DOCK,
    size: isSize(record.size) ? record.size : DEFAULT_SIZE,
  };
}

function writeLayout(layout: SavedLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage can be full or blocked; the layout still works for this session.
  }
}

function subscribeResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}
const getWidth = () => window.innerWidth;
const getHeight = () => window.innerHeight;

export function useViewport() {
  const width = useSyncExternalStore(subscribeResize, getWidth, () => 1024);
  const height = useSyncExternalStore(subscribeResize, getHeight, () => 768);
  return { width, height, isMobile: width < MOBILE_BREAKPOINT };
}

export const isVertical = (dock: Dock) => dock === 'left' || dock === 'right';

/**
 * Dock, size and open state of the desktop console. Dock and size persist; open does not,
 * because the console always starts open.
 */
export function useConsoleLayout() {
  const viewport = useViewport();
  const [{ dock, size }, setLayout] = useState(readLayout);
  const [open, setOpen] = useState(true);

  useEffect(() => writeLayout({ dock, size }), [dock, size]);

  const axis = isVertical(dock) ? viewport.width : viewport.height;
  const maxPx = Math.round(axis * MAX_SIZE_RATIO);
  const minPx = Math.min(MIN_SIZE_PX, maxPx);
  const clampPx = useCallback(
    (px: number) => Math.round(Math.min(Math.max(px, minPx), maxPx)),
    [minPx, maxPx],
  );
  const sizePx = clampPx((size / 100) * axis);

  const setSizePx = useCallback(
    (px: number) => {
      if (axis <= 0) return;
      const clamped = clampPx(px);
      setLayout((current) => ({ ...current, size: (clamped / axis) * 100 }));
    },
    [axis, clampPx],
  );

  // Keep the size the user sees as the same percentage along the new axis.
  const setDock = useCallback(
    (next: Dock) =>
      setLayout((current) => ({
        dock: next,
        size: axis > 0 ? (sizePx / axis) * 100 : current.size,
      })),
    [axis, sizePx],
  );

  const resetSize = useCallback(
    () => setLayout((current) => ({ ...current, size: DEFAULT_SIZE })),
    [],
  );
  const toggle = useCallback(() => setOpen((current) => !current), []);

  return {
    ...viewport,
    dock,
    sizePx,
    minPx,
    maxPx,
    open,
    setOpen,
    toggle,
    setDock,
    setSizePx,
    resetSize,
  };
}
