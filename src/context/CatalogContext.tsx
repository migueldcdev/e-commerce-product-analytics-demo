import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { VinylRecord } from '@/catalog/types';
import {
  CatalogContext,
  RECORDS_URL,
  type CatalogContextValue,
  type CatalogState,
} from './catalog';

async function fetchRecords(signal: AbortSignal): Promise<VinylRecord[]> {
  const response = await fetch(RECORDS_URL, { signal });
  if (!response.ok) throw new Error(`Loading records failed: HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Loading records failed: expected an array');
  return data as VinylRecord[];
}

/** Loads data/records.json once and shares it. No backend: the file is served statically. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecords(controller.signal).then(
      (records) => setState({ status: 'ready', records }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const index = useMemo(
    () =>
      new Map(state.status === 'ready' ? state.records.map((record) => [record.id, record]) : []),
    [state],
  );
  const byId = useCallback((id: string) => index.get(id), [index]);

  const value = useMemo<CatalogContextValue>(
    () => ({ ...state, retry, byId }),
    [state, retry, byId],
  );

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives with its provider
export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within a <CatalogProvider>');
  return context;
}
