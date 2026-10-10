import {
  applyBrowse,
  clearFilters,
  EMPTY_BROWSE,
  genresOf,
  hasActiveFilters,
  parseBrowseParams,
  toBrowseParams,
  type BrowseState,
} from './browse';
import type { VinylRecord } from './types';

function record(overrides: Partial<VinylRecord> & Pick<VinylRecord, 'id'>): VinylRecord {
  return {
    artist: 'Artist',
    title: 'Title',
    year: 2000,
    genre: 'Rock',
    format: 'LP',
    price: 2500,
    currency: 'EUR',
    units: 5,
    description: '',
    image: '/assets/x.webp',
    ...overrides,
  };
}

const RECORDS = [
  record({
    id: 'a',
    artist: 'Beyoncé',
    title: 'Lemonade',
    genre: 'R&B',
    format: '2LP',
    price: 3799,
    year: 2016,
  }),
  record({ id: 'b', artist: 'Ramones', title: 'Ramones', genre: 'Punk', price: 2299, year: 1976 }),
  record({
    id: 'c',
    artist: 'Nas',
    title: 'Illmatic',
    genre: 'Hip-Hop',
    price: 2699,
    year: 1994,
    units: 0,
  }),
  record({
    id: 'd',
    artist: 'The Clash',
    title: 'London Calling',
    genre: 'Punk',
    format: '2LP',
    price: 3299,
    year: 1979,
  }),
];

const ids = (records: VinylRecord[]) => records.map((r) => r.id);
const browse = (change: Partial<BrowseState>) =>
  applyBrowse(RECORDS, { ...EMPTY_BROWSE, ...change });

describe('applyBrowse', () => {
  it('keeps the JSON order for Featured', () => {
    expect(ids(browse({}))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('searches artist, title and genre, ignoring case and accents', () => {
    expect(ids(browse({ query: 'BEYONCE' }))).toEqual(['a']);
    expect(ids(browse({ query: 'illmatic' }))).toEqual(['c']);
    expect(ids(browse({ query: 'punk' }))).toEqual(['b', 'd']);
  });

  it('ORs values within a group and ANDs across groups', () => {
    expect(ids(browse({ genres: ['Punk', 'R&B'] }))).toEqual(['a', 'b', 'd']);
    expect(ids(browse({ genres: ['Punk', 'R&B'], formats: ['2LP'] }))).toEqual(['a', 'd']);
  });

  it('filters by an inclusive price range in euros', () => {
    expect(ids(browse({ minPrice: 23, maxPrice: 33 }))).toEqual(['c', 'd']);
    expect(ids(browse({ maxPrice: 22.99 }))).toEqual(['b']);
  });

  it('hides sold-out records when in stock only is on', () => {
    expect(ids(browse({ inStock: true }))).toEqual(['a', 'b', 'd']);
  });

  it('sorts by price, year and artist', () => {
    expect(ids(browse({ sort: 'price-asc' }))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(browse({ sort: 'price-desc' }))).toEqual(['a', 'd', 'c', 'b']);
    expect(ids(browse({ sort: 'newest' }))).toEqual(['a', 'c', 'd', 'b']);
    expect(ids(browse({ sort: 'artist' }))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('does not mutate its input', () => {
    browse({ sort: 'price-asc' });
    expect(ids(RECORDS)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('URL params', () => {
  it('round-trips a full state', () => {
    const state: BrowseState = {
      query: 'punk',
      genres: ['Punk', 'R&B'],
      formats: ['2LP', '7"'],
      minPrice: 10,
      maxPrice: 40,
      inStock: true,
      sort: 'newest',
    };
    expect(parseBrowseParams(toBrowseParams(state))).toEqual(state);
  });

  it('leaves defaults out', () => {
    expect(toBrowseParams(EMPTY_BROWSE).toString()).toBe('');
  });

  it('ignores unknown and malformed values', () => {
    const state = parseBrowseParams(
      new URLSearchParams('format=LP,CD&sort=random&min=-3&max=abc&stock=yes&genre=Rock,,Rock'),
    );
    expect(state).toEqual({ ...EMPTY_BROWSE, formats: ['LP'], genres: ['Rock'] });
  });
});

describe('helpers', () => {
  it('hasActiveFilters ignores sort', () => {
    expect(hasActiveFilters({ ...EMPTY_BROWSE, sort: 'artist' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_BROWSE, inStock: true })).toBe(true);
  });

  it('clearFilters keeps sort', () => {
    expect(clearFilters({ ...EMPTY_BROWSE, query: 'x', genres: ['Rock'], sort: 'artist' })).toEqual(
      { ...EMPTY_BROWSE, sort: 'artist' },
    );
  });

  it('genresOf lists unique genres A–Z', () => {
    expect(genresOf(RECORDS)).toEqual(['Hip-Hop', 'Punk', 'R&B']);
  });
});
