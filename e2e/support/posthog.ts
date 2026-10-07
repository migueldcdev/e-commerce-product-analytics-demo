import type { Page, Request } from '@playwright/test';

const INGESTION = /\/(e|i\/v0\/e|batch|capture|track|engage|s)\/?$/;

export interface PostHogStub {
  /** Requests that reached an event ingestion endpoint. Must stay empty. */
  ingested: Request[];
}

/**
 * Intercepts every request that does not go to the local preview server.
 * Config and flags get a stub response; ingestion calls are recorded and answered with 200.
 */
export async function stubPostHog(page: Page): Promise<PostHogStub> {
  const stub: PostHogStub = { ingested: [] };

  // posthog-js treats automated browsers (navigator.webdriver, a HeadlessChrome brand in
  // userAgentData) as bots and drops their events.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
  });

  await page.route(
    (url) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
    async (route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());

      if (/^\/(flags|decide)\b/.test(pathname)) {
        return route.fulfill({
          json: {
            featureFlags: {},
            featureFlagPayloads: {},
            flags: {},
            errorsWhileComputingFlags: false,
          },
        });
      }
      if (pathname.endsWith('.js')) {
        return route.fulfill({ contentType: 'application/javascript', body: '' });
      }
      if (pathname.includes('/config')) {
        // Autocapture stays off until remote config explicitly allows it.
        return route.fulfill({ json: { autocapture_opt_out: false } });
      }
      if (INGESTION.test(pathname)) stub.ingested.push(request);
      return route.fulfill({ json: { status: 1 } });
    },
  );

  return stub;
}
