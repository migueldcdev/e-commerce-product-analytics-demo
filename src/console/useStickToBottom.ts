import { useLayoutEffect, useRef, useState, type UIEvent } from 'react';

/** Within this many px of the bottom counts as "at the bottom". */
export const AT_BOTTOM_THRESHOLD = 24;

const ROW_SELECTOR = '[data-entry-id]';

interface Anchor {
  id: string;
  /** Distance from the top of the scroll container to the top of the row, on screen. */
  offset: number;
}

/** Ids are counter strings from the logger, so they compare as numbers. */
const seq = (id: string) => Number(id);

function lastSeq(items: readonly { id: string }[]): number {
  const last = items.at(-1);
  return last ? seq(last.id) : 0;
}

/** The first row that is at least partly visible. Rows are in order, so binary search. */
function readAnchor(container: HTMLElement): Anchor | null {
  const rows = container.querySelectorAll<HTMLElement>(ROW_SELECTOR);
  if (rows.length === 0) return null;
  const top = container.getBoundingClientRect().top;
  let low = 0;
  let high = rows.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (rows[mid].getBoundingClientRect().bottom > top) high = mid;
    else low = mid + 1;
  }
  const row = rows[low];
  return { id: row.dataset.entryId ?? '', offset: row.getBoundingClientRect().top - top };
}

function findRow(container: HTMLElement, id: string): HTMLElement | null {
  for (const row of container.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
    if (row.dataset.entryId === id) return row;
  }
  return null;
}

/**
 * Keeps a growing list pinned to the bottom while the user is there, and perfectly still while
 * they are scrolled up, including when old rows are dropped from the top. Rows must carry
 * `data-entry-id`; the container should set `overflow-anchor: none` so the browser does not
 * adjust a second time.
 */
export function useStickToBottom(items: readonly { id: string }[]) {
  const ref = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [lastSeen, setLastSeen] = useState(() => lastSeq(items));

  // An empty list (e.g. after Clear) is always "at the bottom".
  if (items.length === 0 && !atBottom) setAtBottom(true);

  let newCount = 0;
  if (!atBottom) {
    for (let i = items.length - 1; i >= 0 && seq(items[i].id) > lastSeen; i--) newCount++;
  }

  // Runs when entries change, never when a row opens or closes.
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (atBottom) {
      container.scrollTop = container.scrollHeight;
    } else {
      const anchor = anchorRef.current;
      const row = anchor && findRow(container, anchor.id);
      if (anchor && row) {
        const offset = row.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += offset - anchor.offset;
      }
    }
    anchorRef.current = readAnchor(container);
  }, [items, atBottom]);

  function onScroll(event: UIEvent<HTMLElement>) {
    const container = event.currentTarget;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    const bottom = distance <= AT_BOTTOM_THRESHOLD;
    anchorRef.current = readAnchor(container);
    if (bottom !== atBottom) {
      // Reaching the bottom marks everything seen; leaving it, everything shown so far was seen.
      setAtBottom(bottom);
      setLastSeen(lastSeq(items));
    }
  }

  function jumpToLatest() {
    const container = ref.current;
    if (container) container.scrollTop = container.scrollHeight;
    setAtBottom(true);
    setLastSeen(lastSeq(items));
  }

  return { ref, onScroll, newCount, jumpToLatest };
}
