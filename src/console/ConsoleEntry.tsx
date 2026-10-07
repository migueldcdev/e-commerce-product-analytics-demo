import { memo, useEffect, useState } from 'react';
import { JsonView } from './JsonView';
import type { LogEntry, LogLevel } from './types';

// Colours are AA on the light console background; the level is always shown as text too.
const LEVEL_CLASS: Record<LogLevel, string> = {
  debug: 'text-zinc-600',
  info: 'text-blue-700',
  warn: 'text-amber-800',
  error: 'text-red-700',
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** JSON.stringify(data, null, 2), falling back to a circular-safe version. */
function toJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2) ?? String(data);
  } catch {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      data,
      (_key, value: unknown) => {
        if (typeof value === 'bigint') return `${value}n`;
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      },
      2,
    );
  }
}

function CopyJsonButton({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toJson(data));
      setCopied(true);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); nothing to do.
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2 pr-2">
      {copied && (
        <span role="status" className="text-xs text-zinc-600">
          Copied
        </span>
      )}
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-sm border border-border px-1.5 py-0.5 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        Copy JSON
      </button>
    </div>
  );
}

interface ConsoleEntryProps {
  entry: LogEntry;
  open: boolean;
  onToggle(this: void, id: string): void;
}

const ROW_CLASS =
  'flex min-w-0 flex-1 items-baseline gap-2 px-2 py-0.5 text-left font-mono text-xs';

export const ConsoleEntry = memo(function ConsoleEntry({
  entry,
  open,
  onToggle,
}: ConsoleEntryProps) {
  const detailsId = `console-entry-${entry.id}-details`;
  const expandable = entry.data !== undefined;

  const summary = (
    <>
      <time className="shrink-0 text-zinc-600" dateTime={new Date(entry.timestamp).toISOString()}>
        {formatTime(entry.timestamp)}
      </time>
      <span className={`w-11 shrink-0 font-semibold ${LEVEL_CLASS[entry.level]}`}>
        {entry.level.toUpperCase()}
      </span>
      <span className="shrink-0 text-zinc-600">{entry.source}</span>
      <span className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">{entry.message}</span>
    </>
  );

  return (
    <li data-testid="console-entry" data-entry-id={entry.id} className="border-b border-border/60">
      <div className="flex items-start">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => onToggle(entry.id)}
            className={`${ROW_CLASS} outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`}
          >
            <span aria-hidden="true" className="w-3 shrink-0 text-zinc-600">
              {open ? '▾' : '▸'}
            </span>
            {summary}
          </button>
        ) : (
          <div className={ROW_CLASS}>
            <span aria-hidden="true" className="w-3 shrink-0" />
            {summary}
          </div>
        )}
        {expandable && open && <CopyJsonButton data={entry.data} />}
      </div>
      {expandable && open && (
        // Focusable so keyboard users can scroll a long payload.
        <div
          id={detailsId}
          tabIndex={0}
          className="mx-2 mb-1 ml-7 max-h-80 overflow-auto rounded-sm bg-muted/50 p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <JsonView value={entry.data} />
        </div>
      )}
    </li>
  );
});
