import { createLogger } from './logger';
import type { LogLevel } from './types';

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function idNumber(id: string): number {
  const match = /(\d+)$/.exec(id);
  if (!match) throw new Error(`id "${id}" has no counter`);
  return Number(match[1]);
}

describe('createLogger', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 18, 4, 12, 381));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('recording', () => {
    it.each(LEVELS)('%s() adds an entry with that level, source app, message and data', (level) => {
      const logger = createLogger();
      const data = { a: 1 };

      logger[level]('hello', data);

      const [entry] = logger.getSnapshot().logs;
      expect(entry).toMatchObject({ level, source: 'app', message: 'hello', data });
      expect(entry.timestamp).toBe(Date.now());
    });

    it('log() records the given level, data and source', () => {
      const logger = createLogger();

      logger.log('warn', 'explicit', 42, 'posthog');
      logger.log('error', 'default source');

      const [first, second] = logger.getSnapshot().logs;
      expect(first).toMatchObject({
        level: 'warn',
        message: 'explicit',
        data: 42,
        source: 'posthog',
      });
      expect(second).toMatchObject({ level: 'error', message: 'default source', source: 'app' });
      expect(second.data).toBeUndefined();
    });

    it('metric() adds a metric entry with name, value, unit and tags', () => {
      const logger = createLogger();

      logger.metric('lcp', 1234, { unit: 'ms', tags: { route: '/' } });
      logger.metric('count', 3);

      const { metrics, logs } = logger.getSnapshot();
      expect(logs).toHaveLength(0);
      expect(metrics[0]).toMatchObject({
        source: 'app',
        name: 'lcp',
        value: 1234,
        unit: 'ms',
        tags: { route: '/' },
        timestamp: Date.now(),
      });
      expect(metrics[1]).toMatchObject({ name: 'count', value: 3 });
    });

    it('gives every entry a unique id that increases', () => {
      const logger = createLogger();

      logger.info('a');
      logger.metric('m', 1);
      logger.warn('b');
      logger.error('c');

      const { logs, metrics } = logger.getSnapshot();
      const ids = [...logs, ...metrics].map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);

      const logNumbers = logs.map((entry) => idNumber(entry.id));
      expect(logNumbers).toEqual([...logNumbers].sort((x, y) => x - y));
      expect(logNumbers[0]).toBeLessThan(logNumbers[1]);
      expect(logNumbers[1]).toBeLessThan(logNumbers[2]);
    });

    it('timestamps come from Date.now()', () => {
      const logger = createLogger();

      logger.info('first');
      vi.setSystemTime(new Date(2026, 9, 7, 18, 4, 15, 902));
      logger.info('second');

      const [first, second] = logger.getSnapshot().logs;
      expect(first.timestamp).toBe(new Date(2026, 9, 7, 18, 4, 12, 381).getTime());
      expect(second.timestamp).toBe(new Date(2026, 9, 7, 18, 4, 15, 902).getTime());
    });

    it('stores data by reference without copying it', () => {
      const logger = createLogger();
      const data = { nested: { value: 1 } };

      logger.info('ref', data);

      expect(logger.getSnapshot().logs[0].data).toBe(data);
    });
  });

  describe('scope()', () => {
    it('sets the source on logs and metrics', () => {
      const logger = createLogger();
      const scoped = logger.scope('posthog');

      for (const level of LEVELS) scoped[level](`${level} msg`, { level });
      scoped.metric('events', 5, { unit: 'count' });

      const { logs, metrics } = logger.getSnapshot();
      expect(logs.map((entry) => [entry.level, entry.source, entry.message])).toEqual(
        LEVELS.map((level) => [level, 'posthog', `${level} msg`]),
      );
      expect(metrics[0]).toMatchObject({
        source: 'posthog',
        name: 'events',
        value: 5,
        unit: 'count',
      });
    });
  });

  describe('snapshots', () => {
    it('returns the same object when nothing changed', () => {
      const logger = createLogger();
      expect(logger.getSnapshot()).toBe(logger.getSnapshot());

      logger.info('a');
      const snapshot = logger.getSnapshot();
      expect(logger.getSnapshot()).toBe(snapshot);
    });

    it('returns a new object with new arrays after a change', () => {
      const logger = createLogger();
      logger.info('a');
      const before = logger.getSnapshot();

      logger.info('b');
      const afterLog = logger.getSnapshot();
      expect(afterLog).not.toBe(before);
      expect(afterLog.logs).not.toBe(before.logs);
      expect(before.logs).toHaveLength(1);
      expect(afterLog.logs).toHaveLength(2);

      logger.metric('m', 1);
      const afterMetric = logger.getSnapshot();
      expect(afterMetric).not.toBe(afterLog);
      expect(afterMetric.metrics).not.toBe(afterLog.metrics);
    });
  });

  describe('subscribers', () => {
    it('are called synchronously on every change', () => {
      const logger = createLogger();
      const listener = vi.fn();
      logger.subscribe(listener);

      logger.info('a');
      expect(listener).toHaveBeenCalledTimes(1);
      logger.metric('m', 1);
      expect(listener).toHaveBeenCalledTimes(2);
      logger.scope('posthog').warn('b');
      expect(listener).toHaveBeenCalledTimes(3);
      logger.clear();
      expect(listener).toHaveBeenCalledTimes(4);
    });

    it('stop being called after unsubscribing, and unsubscribing twice is harmless', () => {
      const logger = createLogger();
      const listener = vi.fn();
      const other = vi.fn();
      const unsubscribe = logger.subscribe(listener);
      logger.subscribe(other);

      logger.info('a');
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
      logger.info('b');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(other).toHaveBeenCalledTimes(2);
    });

    it('a listener that throws does not stop the others', () => {
      const logger = createLogger();
      const before = vi.fn();
      const after = vi.fn();
      logger.subscribe(before);
      logger.subscribe(() => {
        throw new Error('boom');
      });
      logger.subscribe(after);

      expect(() => logger.info('a')).not.toThrow();
      expect(before).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
      expect(logger.getSnapshot().logs).toHaveLength(1);
    });
  });

  describe('buffer', () => {
    it('keeps at most 1000 logs and 1000 metrics by default', () => {
      const logger = createLogger();

      for (let i = 0; i < 1005; i++) {
        logger.info(`log ${i}`);
        logger.metric('m', i);
      }

      const { logs, metrics } = logger.getSnapshot();
      expect(logs).toHaveLength(1000);
      expect(metrics).toHaveLength(1000);
      expect(logs[0].message).toBe('log 5');
      expect(logs.at(-1)?.message).toBe('log 1004');
      expect(metrics[0].value).toBe(5);
    });

    it('drops the oldest entry when full, with a configurable size', () => {
      const logger = createLogger({ maxEntries: 3 });

      for (const message of ['a', 'b', 'c', 'd']) logger.info(message);
      for (const value of [1, 2, 3, 4, 5]) logger.metric('m', value);

      const { logs, metrics } = logger.getSnapshot();
      expect(logs.map((entry) => entry.message)).toEqual(['b', 'c', 'd']);
      expect(metrics.map((entry) => entry.value)).toEqual([3, 4, 5]);
    });
  });

  describe('clear()', () => {
    it('empties both lists and notifies subscribers', () => {
      const logger = createLogger();
      logger.info('a');
      logger.metric('m', 1);
      const listener = vi.fn();
      logger.subscribe(listener);

      logger.clear();

      expect(logger.getSnapshot().logs).toHaveLength(0);
      expect(logger.getSnapshot().metrics).toHaveLength(0);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('safety', () => {
    it('never throws, even when recording fails internally', () => {
      const logger = createLogger();
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('clock broke');
      });

      expect(() => logger.info('a')).not.toThrow();
      expect(() => logger.log('error', 'b', undefined, 'posthog')).not.toThrow();
      expect(() => logger.metric('m', 1)).not.toThrow();
      expect(() => logger.scope('posthog').warn('c')).not.toThrow();
    });

    it('never calls console.*', () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => {}),
      );
      const logger = createLogger({ maxEntries: 2 });
      logger.subscribe(() => {
        throw new Error('listener failure');
      });

      for (const level of LEVELS) logger[level]('msg', { a: 1 });
      logger.log('info', 'msg');
      logger.scope('posthog').error('msg');
      logger.metric('m', 1);
      logger.clear();
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('clock broke');
      });
      logger.info('after failure');

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });
  });
});

describe('singletons', () => {
  it('posthogLogger writes to the singleton logger with source posthog', async () => {
    const { logger, posthogLogger } = await import('./logger');
    logger.clear();

    posthogLogger.info('$pageview  /', { $pathname: '/' });

    expect(logger.getSnapshot().logs.at(-1)).toMatchObject({
      level: 'info',
      source: 'posthog',
      message: '$pageview  /',
    });
    logger.clear();
  });

  it('are exported from the public @/console entry point', async () => {
    const fromIndex = await import('@/console');
    const fromModule = await import('./logger');

    expect(fromIndex.logger).toBe(fromModule.logger);
    expect(fromIndex.posthogLogger).toBe(fromModule.posthogLogger);
    expect(fromIndex.createLogger).toBe(fromModule.createLogger);
  });
});
