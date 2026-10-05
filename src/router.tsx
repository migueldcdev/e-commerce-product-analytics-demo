import { createBrowserRouter, type RouteObject } from 'react-router';
import { Home } from '@/routes/Home';
import { NotFound } from '@/routes/NotFound';
import { RootLayout } from '@/routes/RootLayout';

// Exported separately so tests can mount the same table with createMemoryRouter.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
