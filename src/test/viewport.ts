// jsdom has no layout and no matchMedia. This fake evaluates min-width / max-width
// queries against a settable viewport and fires `change` when the result flips.

type Listener = (event: MediaQueryListEvent) => void;

interface FakeMediaQueryList {
  query: string;
  listeners: Set<Listener>;
  last: boolean;
  mql: MediaQueryList;
}

export const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

const lists = new Set<FakeMediaQueryList>();

function evaluate(query: string): boolean {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const conditions = [...query.matchAll(/\((min|max)-(width|height):\s*([\d.]+)px\)/g)];
  if (conditions.length === 0) return false;
  return conditions.every(([, bound, axis, raw]) => {
    const actual = axis === 'width' ? width : height;
    const limit = Number(raw);
    return bound === 'min' ? actual >= limit : actual <= limit;
  });
}

function createMediaQueryList(query: string): MediaQueryList {
  const entry: FakeMediaQueryList = {
    query,
    listeners: new Set(),
    last: evaluate(query),
    mql: undefined as unknown as MediaQueryList,
  };
  const legacy = new Map<unknown, Listener>();

  const mql = {
    media: query,
    get matches() {
      return evaluate(query);
    },
    onchange: null as Listener | null,
    addEventListener: (_type: string, listener: Listener) => entry.listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => entry.listeners.delete(listener),
    addListener: (listener: Listener) => {
      legacy.set(listener, listener);
      entry.listeners.add(listener);
    },
    removeListener: (listener: Listener) => {
      const stored = legacy.get(listener);
      if (stored) entry.listeners.delete(stored);
    },
    dispatchEvent: () => true,
  };
  entry.mql = mql as unknown as MediaQueryList;
  lists.add(entry);
  return entry.mql;
}

export function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => createMediaQueryList(query),
  });
}

/** Resizes the fake viewport, fires `resize` and any media query `change` events. */
export function setViewport(width: number, height: number = DEFAULT_VIEWPORT.height): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    value: height,
  });

  window.dispatchEvent(new Event('resize'));

  for (const entry of lists) {
    const matches = evaluate(entry.query);
    if (matches === entry.last) continue;
    entry.last = matches;
    const event = { matches, media: entry.query } as MediaQueryListEvent;
    for (const listener of entry.listeners) listener(event);
    const onchange = (entry.mql as unknown as { onchange: Listener | null }).onchange;
    onchange?.(event);
  }
}

export function resetViewport(): void {
  lists.clear();
  setViewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
}
