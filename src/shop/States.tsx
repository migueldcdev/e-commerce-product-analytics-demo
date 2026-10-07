import type { ReactNode } from 'react';
import { cn } from 'cn';
import { EYEBROW, FOCUS_RING, GRID } from './styles';

const SKELETON_CELLS = 8;

const OUTLINE_BUTTON = cn(
  FOCUS_RING,
  'mt-8 inline-flex h-11 items-center border border-foreground px-6 text-sm transition-colors hover:bg-foreground hover:text-background',
);

/** Grid-shaped placeholders: same grid, same cell structure as ProductCard. */
export function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading records" aria-busy="true">
      <ul aria-hidden="true" className={GRID}>
        {Array.from({ length: SKELETON_CELLS }, (_, i) => (
          <li key={i} data-testid="skeleton-cell" className="flex animate-pulse flex-col">
            <div className="aspect-square bg-muted" />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-2.5 w-1/2 bg-muted" />
                <div className="h-4 w-4/5 bg-muted" />
                <div className="h-3 w-1/3 bg-muted" />
              </div>
              <div className="h-4 w-14 bg-muted" />
            </div>
            <div className="mt-4 h-4 w-20 bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Off-centre message block, pushed right on wide screens to keep the page asymmetric. */
function Message({
  eyebrow,
  title,
  body,
  children,
  role,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
  role?: 'alert';
}) {
  return (
    <div role={role} className="py-20 sm:py-28 lg:pl-[22%]">
      <p className={cn(EYEBROW, 'text-muted-foreground')}>{eyebrow}</p>
      <h2 className="mt-4 max-w-xl text-3xl/tight font-light tracking-tight text-balance sm:text-4xl/tight">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Message
      eyebrow="0 results"
      title="No records match your filters"
      body="Try fewer filters, a wider price range or a different search."
    >
      <button type="button" onClick={onClear} className={OUTLINE_BUTTON}>
        Clear filters
      </button>
    </Message>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Message
      role="alert"
      eyebrow="Something went wrong"
      title="We couldn’t load the records"
      body="Check your connection and try again."
    >
      <button type="button" onClick={onRetry} className={OUTLINE_BUTTON}>
        Retry
      </button>
    </Message>
  );
}
