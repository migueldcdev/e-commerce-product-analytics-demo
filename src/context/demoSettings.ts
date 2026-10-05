import { createContext } from 'react';

// The 4 personas from the full spec's data generator.
export const PERSONAS = [
  'bargain_hunter',
  'loyal_regular',
  'window_shopper',
  'one_time_buyer',
] as const;
export type Persona = (typeof PERSONAS)[number];

export type Device = 'desktop' | 'mobile';

export interface DemoSettingsState {
  persona: Persona;
  device: Device;
  flagOverrides: Record<string, string>;
}

export interface DemoSettingsContextValue extends DemoSettingsState {
  setPersona: (persona: Persona) => void;
  setDevice: (device: Device) => void;
  setFlagOverride: (flag: string, variant: string) => void;
  reset: () => void;
}

export const DEFAULT_DEMO_SETTINGS: DemoSettingsState = {
  persona: 'bargain_hunter',
  device: 'desktop',
  flagOverrides: {},
};

export const DemoSettingsContext = createContext<DemoSettingsContextValue | null>(null);
