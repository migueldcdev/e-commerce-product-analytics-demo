import type {
  LogEntry,
  LogLevel,
  LogOptions,
  LogSnapshot,
  LogSource,
  Logger,
  MetricEntry,
  MetricOptions,
  ScopedLogger,
} from './types';

export interface CreateLoggerOptions {
  /** Maximum entries kept per list (logs and metrics each). Oldest are dropped first. */
  maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 1000;

/**
 * The single store for logs and metrics. Plain TypeScript so it can be used before React
 * mounts. It never throws and never writes to the browser console: a logging failure must not
 * break analytics or the app.
 */
export function createLogger({
  maxEntries = DEFAULT_MAX_ENTRIES,
}: CreateLoggerOptions = {}): Logger {
  const limit = Math.max(1, Math.floor(maxEntries));
  let snapshot: LogSnapshot = { logs: [], metrics: [] };
  let counter = 0;
  const listeners = new Set<() => void>();

  function append<T>(list: readonly T[], item: T): T[] {
    const next = list.length >= limit ? list.slice(list.length - limit + 1) : list.slice();
    next.push(item);
    return next;
  }

  function notify() {
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch {
        // One failing listener must not stop the others.
      }
    }
  }

  function log(
    level: LogLevel,
    message: string,
    data?: unknown,
    source: LogSource = 'app',
    opts?: LogOptions,
  ) {
    try {
      const entry: LogEntry = {
        id: String(++counter),
        timestamp: Date.now(),
        level,
        source,
        message,
      };
      if (data !== undefined) entry.data = data;
      if (opts?.help) entry.help = opts.help;
      snapshot = { logs: append(snapshot.logs, entry), metrics: snapshot.metrics };
    } catch {
      return;
    }
    notify();
  }

  function metric(source: LogSource, name: string, value: number, opts?: MetricOptions) {
    try {
      const entry: MetricEntry = {
        id: String(++counter),
        timestamp: Date.now(),
        source,
        name,
        value,
      };
      if (opts?.unit !== undefined) entry.unit = opts.unit;
      if (opts?.tags !== undefined) entry.tags = opts.tags;
      snapshot = { logs: snapshot.logs, metrics: append(snapshot.metrics, entry) };
    } catch {
      return;
    }
    notify();
  }

  function scope(source: LogSource): ScopedLogger {
    return {
      debug: (message, data, opts) => log('debug', message, data, source, opts),
      info: (message, data, opts) => log('info', message, data, source, opts),
      warn: (message, data, opts) => log('warn', message, data, source, opts),
      error: (message, data, opts) => log('error', message, data, source, opts),
      metric: (name, value, opts) => metric(source, name, value, opts),
    };
  }

  return {
    ...scope('app'),
    log,
    scope,
    clear() {
      snapshot = { logs: [], metrics: [] };
      notify();
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The app-wide logger. */
export const logger = createLogger();

/** Logger for PostHog events. */
export const posthogLogger = logger.scope('posthog');
