import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { logger as defaultLogger } from './logger';
import type { ConsoleContextValue, Logger } from './types';

interface ConsoleViewState {
  /** Ids of the rows that are open. */
  expanded: ReadonlySet<string>;
  toggle(this: void, id: string): void;
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null);
// Kept apart from the entries so the open rows survive the panel switching layouts.
const ConsoleViewContext = createContext<ConsoleViewState | null>(null);

export function ConsoleProvider({
  children,
  logger = defaultLogger,
}: {
  children: ReactNode;
  /** Defaults to the app-wide singleton. Tests pass their own. */
  logger?: Logger;
}) {
  const snapshot = useSyncExternalStore(logger.subscribe, logger.getSnapshot, logger.getSnapshot);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [prunedFor, setPrunedFor] = useState(snapshot.logs);

  // Forget open rows whose entry left the buffer or was cleared.
  if (prunedFor !== snapshot.logs) {
    setPrunedFor(snapshot.logs);
    if (expanded.size > 0) {
      const present = new Set(snapshot.logs.map((entry) => entry.id));
      const kept = new Set([...expanded].filter((id) => present.has(id)));
      if (kept.size !== expanded.size) setExpanded(kept);
    }
  }

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const value = useMemo<ConsoleContextValue>(
    () => ({
      logs: snapshot.logs,
      metrics: snapshot.metrics,
      logger,
      debug: (message, data) => logger.debug(message, data),
      info: (message, data) => logger.info(message, data),
      warn: (message, data) => logger.warn(message, data),
      error: (message, data) => logger.error(message, data),
      metric: (name, value, opts) => logger.metric(name, value, opts),
      clear: () => {
        setExpanded(new Set());
        logger.clear();
      },
    }),
    [snapshot, logger],
  );

  const view = useMemo<ConsoleViewState>(() => ({ expanded, toggle }), [expanded, toggle]);

  return (
    <ConsoleContext value={value}>
      <ConsoleViewContext value={view}>{children}</ConsoleViewContext>
    </ConsoleContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives with its provider
export function useConsole(): ConsoleContextValue {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error('useConsole must be used within a <ConsoleProvider>');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components -- internal to the console panel
export function useConsoleView(): ConsoleViewState {
  const context = useContext(ConsoleViewContext);
  if (!context) {
    throw new Error('useConsoleView must be used within a <ConsoleProvider>');
  }
  return context;
}
