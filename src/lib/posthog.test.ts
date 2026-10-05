import posthog from 'posthog-js';
import { initPostHog } from './posthog';

describe('initPostHog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('skips init and warns once when the key is missing', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    initPostHog();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('initialises with the env host and registers demo_generated: false', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://eu.i.posthog.com');

    initPostHog();

    expect(posthog.init).toHaveBeenCalledWith('phc_test', { api_host: 'https://eu.i.posthog.com' });
    expect(posthog.register).toHaveBeenCalledWith({ demo_generated: false });
  });
});
