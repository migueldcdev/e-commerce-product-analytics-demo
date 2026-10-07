import posthog from 'posthog-js';
import { posthogLogger } from '@/console';
import { describePostHogEvent } from './describePostHogEvent';
import { describePostHogEventHelp } from './describePostHogEventHelp';

/** Safe to call before React mounts: the logger keeps early events for the console. */
export function initPostHog(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key) {
    posthogLogger.warn('VITE_POSTHOG_KEY is not set; analytics disabled.');
    return;
  }

  posthog.init(key, {
    api_host: host,
    before_send: (event) => {
      if (event) {
        posthogLogger.info(describePostHogEvent(event), event.properties, {
          help: describePostHogEventHelp(event.event),
        });
      }
      return null; // drop the event for now
    },
  });
  posthog.register({ demo_generated: false });
}
