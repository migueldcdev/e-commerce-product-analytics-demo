import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = 4173;

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Runs against the production build, the same bundle Vercel deploys.
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
  },
});
