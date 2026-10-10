const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** Formats a price in cents, e.g. 2999 → "29,99 €". */
export function formatPrice(cents: number): string {
  return EUR.format(cents / 100);
}
