import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsoleEntry } from './ConsoleEntry';
import { useConsole, useConsoleView } from './ConsoleContext';
import { useStickToBottom } from './useStickToBottom';

const BUTTON_CLASS =
  'rounded-sm px-2 py-0.5 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';

export function ConsoleEntryList({ toolbar }: { toolbar?: ReactNode }) {
  const { logs, clear } = useConsole();
  const { expanded, toggle } = useConsoleView();
  const { ref, onScroll, newCount, jumpToLatest } = useStickToBottom(logs);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1">
          <span className="text-xs font-semibold">Console</span>
          <span className="text-xs text-zinc-600">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          <button type="button" onClick={clear} className={BUTTON_CLASS}>
            Clear
          </button>
          <div className="ml-auto flex items-center gap-1">{toolbar}</div>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={ref}
            role="log"
            aria-live="off"
            aria-label="Console entries"
            tabIndex={0}
            onScroll={onScroll}
            className="relative h-full overflow-y-auto outline-none [overflow-anchor:none] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {logs.length === 0 ? (
              <p className="p-3 text-xs text-zinc-600">No logs yet</p>
            ) : (
              <ol>
                {logs.map((entry) => (
                  <ConsoleEntry
                    key={entry.id}
                    entry={entry}
                    open={expanded.has(entry.id)}
                    onToggle={toggle}
                  />
                ))}
              </ol>
            )}
          </div>
          {newCount > 0 && (
            <button
              type="button"
              onClick={jumpToLatest}
              className="absolute right-4 bottom-2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              ↓ {newCount} new
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
