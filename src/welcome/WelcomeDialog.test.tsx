import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WELCOME_DISMISSED_KEY, WelcomeDialog } from './WelcomeDialog';

function renderWelcome() {
  render(
    <>
      <button type="button">App button</button>
      <WelcomeDialog />
    </>,
  );
}

const dialog = () => screen.queryByRole('dialog', { name: 'This is a demo' });
const startButton = () => screen.getByRole('button', { name: 'Understood, start browsing' });

describe('WelcomeDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens on first load as a labelled modal dialog with the full message', () => {
    renderWelcome();

    const welcome = dialog();
    expect(welcome).toBeVisible();
    expect(welcome).toHaveAttribute('aria-modal', 'true');
    expect(welcome).toHaveAccessibleDescription(
      'Play around as much as you like. Nothing will break, and you won’t be charged.',
    );
    expect(screen.getByRole('heading', { name: 'What is this?' })).toBeVisible();
    expect(screen.getByText(/captured with product analytics/)).toBeVisible();
    expect(
      screen.getByText(
        'Your clicks, searches and filters on this page are recorded as anonymous events for this demo.',
      ),
    ).toBeVisible();
    // The page behind is hidden from assistive tech while the dialog is open.
    expect(screen.queryByRole('button', { name: 'App button' })).not.toBeInTheDocument();
  });

  it('focuses the button on open and keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderWelcome();

    expect(startButton()).toHaveFocus();
    await user.tab();
    expect(startButton()).toHaveFocus();
    await user.tab({ shift: true });
    expect(startButton()).toHaveFocus();
  });

  it('closes with the button, remembers it for the session and returns focus to the page', async () => {
    const user = userEvent.setup();
    renderWelcome();

    await user.click(startButton());

    expect(dialog()).not.toBeInTheDocument();
    expect(sessionStorage.getItem(WELCOME_DISMISSED_KEY)).toBe('1');
    expect(document.body).toHaveFocus();
    expect(screen.getByRole('button', { name: 'App button' })).toBeVisible();
  });

  it('closes with Esc', async () => {
    const user = userEvent.setup();
    renderWelcome();

    await user.keyboard('{Escape}');

    expect(dialog()).not.toBeInTheDocument();
    expect(sessionStorage.getItem(WELCOME_DISMISSED_KEY)).toBe('1');
  });

  it('ignores clicks on the backdrop', () => {
    renderWelcome();

    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);

    expect(dialog()).toBeVisible();
  });

  it('stays closed once dismissed in this session', () => {
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, '1');
    renderWelcome();

    expect(dialog()).not.toBeInTheDocument();
  });

  it('shows on every load when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    renderWelcome();

    expect(dialog()).toBeVisible();
    await user.click(startButton());
    expect(dialog()).not.toBeInTheDocument();
  });
});
