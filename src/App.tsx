import { RouterProvider } from 'react-router';
import { Console, ConsoleProvider } from '@/console';
import { DemoSettingsProvider } from '@/context/DemoSettingsContext';
import { router } from '@/router';
import { WelcomeDialog } from '@/welcome/WelcomeDialog';

export function App() {
  return (
    <ConsoleProvider>
      <Console>
        <DemoSettingsProvider>
          <RouterProvider router={router} />
          <WelcomeDialog />
        </DemoSettingsProvider>
      </Console>
    </ConsoleProvider>
  );
}
