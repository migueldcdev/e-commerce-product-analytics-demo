import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { installMatchMedia, resetViewport } from './viewport';

// No test may reach PostHog over the network.
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
  },
}));

// jsdom has no matchMedia; every test starts on a 1280x800 desktop viewport.
installMatchMedia();
resetViewport();

afterEach(() => {
  cleanup();
  resetViewport();
  localStorage.clear();
});
