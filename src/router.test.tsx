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
  it('renders the project name as the only h1', () => {
    renderAt('/');
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName(/e-commerce product analytics demo/i);
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
  });

  it('renders Not Found for an unknown path', () => {
    renderAt('/missing');
    expect(
      screen.getByRole('heading', { level: 1, name: /e-commerce product analytics demo/i }),
    ).toBeVisible();
    expect(screen.getByText(/page not found/i)).toBeVisible();
  });
});
