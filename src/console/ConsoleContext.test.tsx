import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConsoleProvider, useConsole } from './ConsoleContext';
import { createLogger, logger } from './logger';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConsoleProvider>{children}</ConsoleProvider>
);

describe('useConsole', () => {
  beforeEach(() => logger.clear());
  afterEach(() => {
    logger.clear();
    vi.restoreAllMocks();
  });

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useConsole())).toThrow(
      'useConsole must be used within a <ConsoleProvider>',
    );
  });

  it('exposes the singleton logger by default', () => {
    const { result } = renderHook(() => useConsole(), { wrapper });
    expect(result.current.logger).toBe(logger);
  });

  it('shows entries logged before the provider mounted', () => {
    logger.info('early', { early: true });
    logger.metric('boot', 12, { unit: 'ms' });

    const { result } = renderHook(() => useConsole(), { wrapper });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toMatchObject({ message: 'early', data: { early: true } });
    expect(result.current.metrics[0]).toMatchObject({ name: 'boot', value: 12 });
  });

  it('re-renders a component when an entry arrives from outside React', () => {
    function Count() {
      const { logs } = useConsole();
      return <p>{logs.length} logs</p>;
    }
    render(
      <ConsoleProvider>
        <Count />
      </ConsoleProvider>,
    );
    expect(screen.getByText('0 logs')).toBeInTheDocument();

    act(() => {
      logger.info('outside react');
    });

    expect(screen.getByText('1 logs')).toBeInTheDocument();
  });

  it('logging methods write with source app, and clear() empties the store', () => {
    const { result } = renderHook(() => useConsole(), { wrapper });

    act(() => {
      result.current.debug('d');
      result.current.info('i', { x: 1 });
      result.current.warn('w');
      result.current.error('e');
      result.current.metric('m', 7, { tags: { a: 'b' } });
    });

    expect(result.current.logs.map((entry) => [entry.level, entry.source, entry.message])).toEqual([
      ['debug', 'app', 'd'],
      ['info', 'app', 'i'],
      ['warn', 'app', 'w'],
      ['error', 'app', 'e'],
    ]);
    expect(result.current.metrics[0]).toMatchObject({ source: 'app', name: 'm', value: 7 });
    expect(logger.getSnapshot().logs).toHaveLength(4);

    act(() => {
      result.current.clear();
    });

    expect(result.current.logs).toHaveLength(0);
    expect(result.current.metrics).toHaveLength(0);
  });

  it('accepts an injected logger for isolated tests', () => {
    const isolated = createLogger();
    isolated.info('isolated');

    const { result } = renderHook(() => useConsole(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ConsoleProvider logger={isolated}>{children}</ConsoleProvider>
      ),
    });

    expect(result.current.logger).toBe(isolated);
    expect(result.current.logs.map((entry) => entry.message)).toEqual(['isolated']);
    expect(logger.getSnapshot().logs).toHaveLength(0);
  });
});
