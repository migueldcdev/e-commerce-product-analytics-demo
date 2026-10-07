export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogSource = 'app' | 'posthog'; // extended as new sources are added

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  /** One-line summary shown on the row. */
  message: string;
  /** Full payload shown when the row is opened. */
  data?: unknown;
}

export interface MetricEntry {
  id: string;
  timestamp: number;
  source: LogSource;
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

export interface LogSnapshot {
  logs: readonly LogEntry[];
  metrics: readonly MetricEntry[];
}

export interface MetricOptions {
  unit?: string;
  tags?: Record<string, string>;
}

export interface ScopedLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  metric(name: string, value: number, opts?: MetricOptions): void;
}

/** The level shortcuts and metric() use source 'app'. */
export interface Logger extends ScopedLogger {
  log(level: LogLevel, message: string, data?: unknown, source?: LogSource): void;
  scope(source: LogSource): ScopedLogger;
  clear(): void;
  getSnapshot(this: void): LogSnapshot;
  subscribe(this: void, listener: () => void): () => void;
}

export interface ConsoleContextValue extends LogSnapshot, ScopedLogger {
  logger: Logger;
  clear(this: void): void;
}
