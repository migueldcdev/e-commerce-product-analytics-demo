import { RouterProvider } from 'react-router';
import { Console, ConsoleProvider } from '@/console';
import { DemoSettingsProvider } from '@/context/DemoSettingsContext';
import { router } from '@/router';

export function App() {
  return (
    <ConsoleProvider>
      <Console>
        <DemoSettingsProvider>
          <RouterProvider router={router} />
        </DemoSettingsProvider>
      </Console>
    </ConsoleProvider>
  );
}
