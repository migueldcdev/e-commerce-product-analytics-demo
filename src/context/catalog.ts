import { createContext } from 'react';
import type { VinylRecord } from '@/catalog/types';

export const RECORDS_URL = '/data/records.json';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; records: VinylRecord[] };

export type CatalogContextValue = CatalogState & {
  /** Fetches the records again after an error. */
  retry: () => void;
  /** Looks a record up by id. Undefined until the records are loaded. */
  byId: (id: string) => VinylRecord | undefined;
};

export const CatalogContext = createContext<CatalogContextValue | null>(null);
