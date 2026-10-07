import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = 4173;

// The build gets a fake PostHog key and host so posthog-js initialises. Every request to
// the host is intercepted in the tests (see e2e/support/posthog.ts); nothing leaves the machine.
const E2E_POSTHOG_HOST = 'https://posthog.e2e.test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: isCI ? 'on-first-retry' : 'off',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /\.mobile\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
    {
      // iPhone 13 viewport, touch and user agent, run in Chromium (the only browser CI installs).
      name: 'mobile',
      testIgnore: /\.desktop\.spec\.ts$/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
  // Runs against the production build, the same bundle Vercel deploys.
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      VITE_POSTHOG_KEY: 'phc_e2e_test_key',
      VITE_POSTHOG_HOST: E2E_POSTHOG_HOST,
    },
  },
});
