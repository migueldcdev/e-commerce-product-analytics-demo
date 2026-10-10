import { useId } from 'react';
import { cn } from 'cn';
import { LOW_STOCK_MAX, type VinylRecord } from '@/catalog/types';
import { formatPrice } from '@/lib/format';
import { EYEBROW, FOCUS_RING } from './styles';

export interface ProductCardProps {
  record: VinylRecord;
  addToCart: (recordId: string) => void;
}

/**
 * Placeholder card until the Product Card spec lands. It renders what the browse page needs
 * and calls addToCart; the page owns stock rules and feedback.
 */
export function ProductCard({ record, addToCart }: ProductCardProps) {
  const titleId = useId();
  const soldOut = record.units <= 0;
  const lowStock = !soldOut && record.units <= LOW_STOCK_MAX;

  return (
    <article aria-labelledby={titleId} data-testid="product-card" className="flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={record.image}
          alt={`${record.title} by ${record.artist}, album cover`}
          loading="lazy"
          decoding="async"
          width={600}
          height={600}
          className={cn('size-full object-cover', soldOut && 'opacity-50 grayscale')}
        />
        {record.isNew && !soldOut && (
          <span className={cn(EYEBROW, 'absolute top-0 left-0 bg-background px-2.5 py-1.5')}>
            New
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn(EYEBROW, 'truncate text-muted-foreground')}>{record.artist}</p>
          <h2 id={titleId} className="mt-1.5 text-[0.9375rem]/snug font-medium text-balance">
            {record.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {record.year} · {record.format}
          </p>
        </div>
        <p className="shrink-0 pt-px text-sm tabular-nums" data-testid="price">
          {formatPrice(record.price)}
        </p>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <button
          type="button"
          aria-disabled={soldOut || undefined}
          aria-label={soldOut ? `${record.title}: sold out` : `Add ${record.title} to cart`}
          onClick={() => addToCart(record.id)}
          className={cn(
            FOCUS_RING,
            'border-b pb-0.5 text-sm transition-colors',
            soldOut
              ? 'cursor-not-allowed border-transparent text-muted-foreground'
              : 'border-foreground hover:border-transparent',
          )}
        >
          {soldOut ? 'Sold out' : 'Add to cart'}
        </button>
        {lowStock && <p className="text-xs text-orange-800">Only {record.units} left</p>}
      </div>
    </article>
  );
}
