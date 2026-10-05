import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_DEMO_SETTINGS,
  DemoSettingsContext,
  type DemoSettingsContextValue,
  type DemoSettingsState,
  type Device,
  type Persona,
} from './demoSettings';

export function DemoSettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoSettingsState>(DEFAULT_DEMO_SETTINGS);

  const setPersona = useCallback((persona: Persona) => {
    setState((prev) => ({ ...prev, persona }));
  }, []);

  const setDevice = useCallback((device: Device) => {
    setState((prev) => ({ ...prev, device }));
  }, []);

  const setFlagOverride = useCallback((flag: string, variant: string) => {
    setState((prev) => ({ ...prev, flagOverrides: { ...prev.flagOverrides, [flag]: variant } }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_DEMO_SETTINGS);
  }, []);

  const value = useMemo<DemoSettingsContextValue>(
    () => ({ ...state, setPersona, setDevice, setFlagOverride, reset }),
    [state, setPersona, setDevice, setFlagOverride, reset],
  );

  return <DemoSettingsContext value={value}>{children}</DemoSettingsContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives with its provider
export function useDemoSettings(): DemoSettingsContextValue {
  const context = useContext(DemoSettingsContext);
  if (!context) {
    throw new Error('useDemoSettings must be used within a <DemoSettingsProvider>');
  }
  return context;
}
