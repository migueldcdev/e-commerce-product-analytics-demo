import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// No test may reach PostHog over the network.
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});
