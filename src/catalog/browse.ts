import { FORMATS, type Format, type VinylRecord } from './types';

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price low→high' },
  { value: 'price-desc', label: 'Price high→low' },
  { value: 'newest', label: 'Newest release' },
  { value: 'artist', label: 'Artist A–Z' },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]['value'];
export const DEFAULT_SORT: SortKey = 'featured';

/** Everything the browse page filters and sorts by. Prices are whole euros. */
export interface BrowseState {
  query: string;
  genres: string[];
  formats: Format[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: SortKey;
}

export const EMPTY_BROWSE: BrowseState = {
  query: '',
  genres: [],
  formats: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  sort: DEFAULT_SORT,
};

// Query param names. Lists are comma separated: ?genre=Rock,Punk
const P = {
  query: 'q',
  genres: 'genre',
  formats: 'format',
  minPrice: 'min',
  maxPrice: 'max',
  inStock: 'stock',
  sort: 'sort',
} as const;

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return [...new Set(raw.split(',').filter(Boolean))];
}

function readPrice(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

function isSort(value: string | null): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/** Reads the browse state from the URL. Unknown or malformed values fall back to defaults. */
export function parseBrowseParams(params: URLSearchParams): BrowseState {
  const sort = params.get(P.sort);
  return {
    query: (params.get(P.query) ?? '').trim(),
    genres: readList(params, P.genres),
    formats: readList(params, P.formats).filter(isFormat),
    minPrice: readPrice(params, P.minPrice),
    maxPrice: readPrice(params, P.maxPrice),
    inStock: params.get(P.inStock) === '1',
    sort: isSort(sort) ? sort : DEFAULT_SORT,
  };
}

/** Writes the browse state to query params, leaving defaults out so URLs stay short. */
export function toBrowseParams(state: BrowseState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query) params.set(P.query, state.query);
  if (state.genres.length) params.set(P.genres, state.genres.join(','));
  if (state.formats.length) params.set(P.formats, state.formats.join(','));
  if (state.minPrice !== null) params.set(P.minPrice, String(state.minPrice));
  if (state.maxPrice !== null) params.set(P.maxPrice, String(state.maxPrice));
  if (state.inStock) params.set(P.inStock, '1');
  if (state.sort !== DEFAULT_SORT) params.set(P.sort, state.sort);
  return params;
}

/** True when any filter or the search narrows the results. Sort does not count. */
export function hasActiveFilters(state: BrowseState): boolean {
  return (
    state.query !== '' ||
    state.genres.length > 0 ||
    state.formats.length > 0 ||
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.inStock
  );
}

/** Clears search and filters but keeps the sort order. */
export function clearFilters(state: BrowseState): BrowseState {
  return { ...EMPTY_BROWSE, sort: state.sort };
}

/** Lower case without accents, so "beyonce" finds "Beyoncé". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function matchesQuery(record: VinylRecord, query: string): boolean {
  if (!query) return true;
  const needle = normalize(query);
  return [record.artist, record.title, record.genre].some((field) =>
    normalize(field).includes(needle),
  );
}

const COMPARE: Record<Exclude<SortKey, 'featured'>, (a: VinylRecord, b: VinylRecord) => number> = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  newest: (a, b) => b.year - a.year,
  artist: (a, b) => a.artist.localeCompare(b.artist, 'en', { sensitivity: 'base' }),
};

/**
 * Filters and sorts records. Groups combine with AND, values within a group with OR.
 * Sorting is stable, so ties keep the featured (JSON) order.
 */
export function applyBrowse(records: readonly VinylRecord[], state: BrowseState): VinylRecord[] {
  const minCents = state.minPrice === null ? null : state.minPrice * 100;
  const maxCents = state.maxPrice === null ? null : state.maxPrice * 100;

  const filtered = records.filter(
    (record) =>
      matchesQuery(record, state.query) &&
      (state.genres.length === 0 || state.genres.includes(record.genre)) &&
      (state.formats.length === 0 || state.formats.includes(record.format)) &&
      (minCents === null || record.price >= minCents) &&
      (maxCents === null || record.price <= maxCents) &&
      (!state.inStock || record.units > 0),
  );

  return state.sort === 'featured' ? filtered : filtered.toSorted(COMPARE[state.sort]);
}

/** Genres present in the catalog, A–Z. */
export function genresOf(records: readonly VinylRecord[]): string[] {
  return [...new Set(records.map((record) => record.genre))].toSorted((a, b) =>
    a.localeCompare(b, 'en'),
  );
}
