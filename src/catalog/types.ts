export const FORMATS = ['LP', '2LP', 'EP', '7"', 'Box set'] as const;
export type Format = (typeof FORMATS)[number];

/** One record in data/records.json. Named VinylRecord so it does not shadow the global Record. */
export interface VinylRecord {
  /** Unique, URL-safe slug, e.g. "miles-davis-kind-of-blue". */
  id: string;
  artist: string;
  title: string;
  /** Original release year. */
  year: number;
  genre: string;
  format: Format;
  /** In cents: 2999 = 29,99 €. */
  price: number;
  currency: 'EUR';
  /** Stock on hand; 0 = sold out. */
  units: number;
  description: string;
  /** Path under /assets/. */
  image: string;
  isNew?: boolean;
}

/** Records with 1 to this many units on hand are shown as low stock. */
export const LOW_STOCK_MAX = 5;
