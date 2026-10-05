import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DemoSettingsProvider, useDemoSettings } from './DemoSettingsContext';
import { DEFAULT_DEMO_SETTINGS } from './demoSettings';

const wrapper = ({ children }: { children: ReactNode }) => (
  <DemoSettingsProvider>{children}</DemoSettingsProvider>
);

describe('useDemoSettings', () => {
  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useDemoSettings())).toThrow(
      'useDemoSettings must be used within a <DemoSettingsProvider>',
    );
  });

  it('starts with the default settings', () => {
    const { result } = renderHook(() => useDemoSettings(), { wrapper });
    expect(result.current).toMatchObject(DEFAULT_DEMO_SETTINGS);
  });

  it('reset restores the defaults after changes', () => {
    const { result } = renderHook(() => useDemoSettings(), { wrapper });

    act(() => {
      result.current.setPersona('loyal_regular');
      result.current.setDevice('mobile');
      result.current.setFlagOverride('checkout-layout', 'test');
    });
    expect(result.current).toMatchObject({
      persona: 'loyal_regular',
      device: 'mobile',
      flagOverrides: { 'checkout-layout': 'test' },
    });

    act(() => result.current.reset());
    expect(result.current).toMatchObject(DEFAULT_DEMO_SETTINGS);
  });
});
