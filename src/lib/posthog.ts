import posthog from 'posthog-js';

export function initPostHog(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key) {
    console.warn('[posthog] VITE_POSTHOG_KEY is not set; analytics disabled.');
    return;
  }

  posthog.init(key, { api_host: host });
  posthog.register({ demo_generated: false });
}
