import type { VinylRecord } from '@/catalog/types';
import { formatPrice } from '@/lib/format';
import { addLine, setLineQuantity, type CartLine } from './cart';

function record(id: string, units: number): VinylRecord {
  return {
    id,
    artist: 'Artist',
    title: id,
    year: 2000,
    genre: 'Rock',
    format: 'LP',
    price: 2999,
    currency: 'EUR',
    units,
    description: '',
    image: '/assets/x.webp',
  };
}

describe('addLine', () => {
  it('adds a new line, then increments it', () => {
    const r = record('a', 3);
    const first = addLine([], r);
    expect(first.result).toMatchObject({ ok: true, quantity: 1 });
    const second = addLine(first.lines, r);
    expect(second.lines).toEqual([{ recordId: 'a', quantity: 2 }]);
  });

  it('rejects sold-out records', () => {
    const { lines, result } = addLine([], record('a', 0));
    expect(result).toMatchObject({ ok: false, reason: 'sold-out' });
    expect(lines).toEqual([]);
  });

  it('rejects quantities above stock', () => {
    const start: CartLine[] = [{ recordId: 'a', quantity: 2 }];
    const { lines, result } = addLine(start, record('a', 2));
    expect(result).toMatchObject({ ok: false, reason: 'stock-limit' });
    expect(lines).toBe(start);
  });

  it('rejects unknown records', () => {
    expect(addLine([], undefined).result).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('setLineQuantity', () => {
  const lines: CartLine[] = [{ recordId: 'a', quantity: 1 }];

  it('clamps to stock', () => {
    expect(setLineQuantity(lines, record('a', 3), 10)).toEqual([{ recordId: 'a', quantity: 3 }]);
  });

  it('removes the line at 0', () => {
    expect(setLineQuantity(lines, record('a', 3), 0)).toEqual([]);
  });
});

describe('formatPrice', () => {
  it('formats cents as es-ES euros', () => {
    expect(formatPrice(2999)).toBe('29,99 €');
  });
});
