import { RouterProvider } from 'react-router';
import { DemoSettingsProvider } from '@/context/DemoSettingsContext';
import { router } from '@/router';

export function App() {
  return (
    <DemoSettingsProvider>
      <RouterProvider router={router} />
    </DemoSettingsProvider>
  );
}
