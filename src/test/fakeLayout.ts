// A tiny layout engine for the console list, since jsdom does no layout.
//
// - The scroll container is the element with role="log".
// - Each row is an element with data-testid="console-entry", stacked top to bottom.
//   A row is `rowHeight` tall, plus `expandedExtra` while its header has aria-expanded="true".
// - The container is `viewportHeight` tall; scrollTop is stored and clamped like a browser does.
// - offsetTop, offsetHeight, scrollHeight, clientHeight, getBoundingClientRect, scrollTo and
//   scrollIntoView all agree with that model, so the implementation may use any of them.

export interface FakeLayoutOptions {
  rowHeight?: number;
  expandedExtra?: number;
  viewportHeight?: number;
}

const ROW = '[data-testid="console-entry"]';

type Patched = 'scrollTop' | 'scrollHeight' | 'clientHeight' | 'offsetTop' | 'offsetHeight';

export function installFakeLayout(options: FakeLayoutOptions = {}): () => void {
  const { rowHeight = 20, expandedExtra = 100, viewportHeight = 100 } = options;
  const proto = HTMLElement.prototype;
  const elementProto = Element.prototype;
  const scrollTops = new WeakMap<Element, number>();

  const isLog = (el: Element) => el.getAttribute('role') === 'log';
  const isRow = (el: Element) => el.matches(ROW);
  const logOf = (el: Element) => el.closest('[role="log"]');

  const rowsIn = (log: Element) => Array.from(log.querySelectorAll<HTMLElement>(ROW));
  const heightOf = (row: Element) => {
    const header = row.querySelector('[aria-expanded]');
    return rowHeight + (header?.getAttribute('aria-expanded') === 'true' ? expandedExtra : 0);
  };
  const contentHeight = (log: Element) => rowsIn(log).reduce((sum, row) => sum + heightOf(row), 0);
  const maxScroll = (log: Element) => Math.max(0, contentHeight(log) - viewportHeight);
  const clamp = (log: Element, value: number) => Math.min(Math.max(0, value), maxScroll(log));
  const getScrollTop = (log: Element) => clamp(log, scrollTops.get(log) ?? 0);
  const setScrollTop = (log: Element, value: number) => scrollTops.set(log, clamp(log, value));
  const rowTop = (row: Element) => {
    const log = logOf(row);
    if (!log) return 0;
    let top = 0;
    for (const other of rowsIn(log)) {
      if (other === row) break;
      top += heightOf(other);
    }
    return top;
  };

  const originals = new Map<Patched, PropertyDescriptor | undefined>();
  const patch = (name: Patched, descriptor: PropertyDescriptor) => {
    // Remember only HTMLElement's own descriptor; deleting ours falls back to Element's.
    originals.set(name, Object.getOwnPropertyDescriptor(proto, name));
    Object.defineProperty(proto, name, { configurable: true, ...descriptor });
  };

  patch('scrollTop', {
    get(this: HTMLElement) {
      return isLog(this) ? getScrollTop(this) : 0;
    },
    set(this: HTMLElement, value: number) {
      if (isLog(this)) setScrollTop(this, value);
    },
  });
  patch('scrollHeight', {
    get(this: HTMLElement) {
      return isLog(this) ? Math.max(contentHeight(this), viewportHeight) : 0;
    },
  });
  patch('clientHeight', {
    get(this: HTMLElement) {
      if (isLog(this)) return viewportHeight;
      return isRow(this) ? heightOf(this) : 0;
    },
  });
  patch('offsetHeight', {
    get(this: HTMLElement) {
      if (isLog(this)) return viewportHeight;
      return isRow(this) ? heightOf(this) : 0;
    },
  });
  patch('offsetTop', {
    get(this: HTMLElement) {
      return isRow(this) ? rowTop(this) : 0;
    },
  });

  const originalRect = Object.getOwnPropertyDescriptor(elementProto, 'getBoundingClientRect');
  const originalRectFn = originalRect?.value as (this: Element) => DOMRect;
  elementProto.getBoundingClientRect = function (this: Element) {
    if (isLog(this)) return new DOMRect(0, 0, 600, viewportHeight);
    if (isRow(this)) {
      const log = logOf(this);
      const top = rowTop(this) - (log ? getScrollTop(log) : 0);
      return new DOMRect(0, top, 600, heightOf(this));
    }
    return originalRectFn.call(this);
  };

  const originalScrollTo = Object.getOwnPropertyDescriptor(elementProto, 'scrollTo');
  elementProto.scrollTo = function (this: Element, arg?: ScrollToOptions | number, y?: number) {
    if (!isLog(this)) return;
    const top = typeof arg === 'number' ? y : arg?.top;
    if (typeof top === 'number') setScrollTop(this, top);
  };

  const originalScrollIntoView = Object.getOwnPropertyDescriptor(elementProto, 'scrollIntoView');
  elementProto.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
    const log = logOf(this);
    if (!log) return;
    const block = typeof arg === 'object' ? arg.block : arg === false ? 'end' : 'start';
    const target = isRow(this) ? this : this.closest(ROW);
    if (!target) {
      setScrollTop(log, block === 'start' ? 0 : maxScroll(log));
      return;
    }
    const top = rowTop(target);
    setScrollTop(log, block === 'end' ? top + heightOf(target) - viewportHeight : top);
  };

  return () => {
    for (const [name, ownDescriptor] of originals) {
      if (ownDescriptor) Object.defineProperty(proto, name, ownDescriptor);
      else delete (proto as unknown as Record<string, unknown>)[name];
    }
    for (const [name, descriptor] of [
      ['getBoundingClientRect', originalRect],
      ['scrollTo', originalScrollTo],
      ['scrollIntoView', originalScrollIntoView],
    ] as const) {
      if (descriptor) Object.defineProperty(elementProto, name, descriptor);
      else delete (elementProto as unknown as Record<string, unknown>)[name];
    }
  };
}
