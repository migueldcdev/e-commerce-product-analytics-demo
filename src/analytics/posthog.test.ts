import posthog, { type CaptureResult, type PostHogConfig } from 'posthog-js';
import { logger } from '@/console';
import { describePostHogEvent } from './describePostHogEvent';
import { initPostHog } from './posthog';

function initConfig(): Partial<PostHogConfig> {
  const call = vi.mocked(posthog.init).mock.calls[0];
  if (!call) throw new Error('posthog.init was not called');
  return call[1] as Partial<PostHogConfig>;
}

function beforeSend(): (event: CaptureResult | null) => CaptureResult | null {
  const hook = initConfig().before_send;
  if (typeof hook !== 'function') throw new Error('before_send is not a function');
  return hook;
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('initPostHog', () => {
  beforeEach(() => logger.clear());

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    logger.clear();
  });

  describe('with a key', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
      vi.stubEnv('VITE_POSTHOG_HOST', 'https://eu.i.posthog.com');
    });

    it('initialises with the env key and api_host', () => {
      initPostHog();

      expect(posthog.init).toHaveBeenCalledTimes(1);
      expect(vi.mocked(posthog.init).mock.calls[0][0]).toBe('phc_test');
      expect(initConfig()).toMatchObject({ api_host: 'https://eu.i.posthog.com' });
    });

    it('registers demo_generated: false', () => {
      initPostHog();
      expect(posthog.register).toHaveBeenCalledWith({ demo_generated: false });
    });

    it('before_send logs the event summary and properties under source posthog, and drops the event', () => {
      initPostHog();
      const properties = { $pathname: '/dashboard', $os: 'Windows' };
      const event = { event: '$pageview', properties } as unknown as CaptureResult;

      const result = beforeSend()(event);

      expect(result).toBeNull();
      const entries = logger.getSnapshot().logs;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: 'info',
        source: 'posthog',
        message: describePostHogEvent(event),
      });
      expect(entries[0].message).toBe('$pageview  /dashboard');
      expect(entries[0].data).toBe(properties);
    });

    it('before_send(null) returns null and logs nothing', () => {
      initPostHog();

      expect(beforeSend()(null)).toBeNull();
      expect(logger.getSnapshot().logs).toHaveLength(0);
    });

    it('prints nothing to the browser console', () => {
      const spies = consoleMethods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));

      initPostHog();
      beforeSend()({ event: '$autocapture', properties: {} } as unknown as CaptureResult);

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('without a key', () => {
    it('logs a warn entry, skips init and prints nothing to the browser console', () => {
      vi.stubEnv('VITE_POSTHOG_KEY', '');
      const spies = consoleMethods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));

      initPostHog();

      expect(posthog.init).not.toHaveBeenCalled();
      expect(posthog.register).not.toHaveBeenCalled();
      const entries = logger.getSnapshot().logs;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: 'warn',
        source: 'posthog',
        message: 'VITE_POSTHOG_KEY is not set; analytics disabled.',
      });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });
  });
});
