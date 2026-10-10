import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { DemoSettingsProvider } from '@/context/DemoSettingsContext';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <DemoSettingsProvider>
      <RouterProvider router={router} />
    </DemoSettingsProvider>,
  );
}

describe('routes', () => {
  beforeEach(() => {
    // The catalog fetches data/records.json; keep it loading.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the browse page with the store header', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /side a records, home/i })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: /search records/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /cart, 0 items/i })).toBeVisible();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName('Records');
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
  });

  it('renders Not Found for an unknown path', () => {
    renderAt('/missing');
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /browse all records/i })).toHaveAttribute('href', '/');
  });
});
