import { createContext } from 'react';
import type { VinylRecord } from '@/catalog/types';

export interface CartLine {
  recordId: string;
  quantity: number;
}

export type AddResult =
  | { ok: true; record: VinylRecord; quantity: number }
  | { ok: false; reason: 'unknown' }
  | { ok: false; reason: 'sold-out' | 'stock-limit'; record: VinylRecord };

/** A cart line joined with its record, for display. */
export interface CartItem extends CartLine {
  record: VinylRecord;
  /** In cents. */
  lineTotal: number;
}

export interface CartContextValue {
  items: CartItem[];
  /** Total units across all lines. */
  count: number;
  /** In cents. */
  subtotal: number;
  /** Adds one unit. Rejects sold-out records and quantities above stock. */
  addToCart: (recordId: string) => AddResult;
  /** Sets a line's quantity, clamped to stock. 0 removes the line. */
  setQuantity: (recordId: string, quantity: number) => void;
  remove: (recordId: string) => void;
}

/** Pure add: the new lines and what happened. Unchanged lines are returned as-is on rejection. */
export function addLine(
  lines: readonly CartLine[],
  record: VinylRecord | undefined,
): { lines: readonly CartLine[]; result: AddResult } {
  if (!record) return { lines, result: { ok: false, reason: 'unknown' } };
  if (record.units <= 0) return { lines, result: { ok: false, reason: 'sold-out', record } };

  const current = lines.find((line) => line.recordId === record.id)?.quantity ?? 0;
  if (current >= record.units) {
    return { lines, result: { ok: false, reason: 'stock-limit', record } };
  }

  const quantity = current + 1;
  const next =
    current === 0
      ? [...lines, { recordId: record.id, quantity }]
      : lines.map((line) => (line.recordId === record.id ? { ...line, quantity } : line));
  return { lines: next, result: { ok: true, record, quantity } };
}

/** Pure set: clamps to 0…units; 0 removes the line. */
export function setLineQuantity(
  lines: readonly CartLine[],
  record: VinylRecord | undefined,
  quantity: number,
): readonly CartLine[] {
  if (!record) return lines;
  const clamped = Math.max(0, Math.min(Math.floor(quantity), record.units));
  if (clamped === 0) return lines.filter((line) => line.recordId !== record.id);
  return lines.map((line) => (line.recordId === record.id ? { ...line, quantity: clamped } : line));
}

export const CartContext = createContext<CartContextValue | null>(null);
