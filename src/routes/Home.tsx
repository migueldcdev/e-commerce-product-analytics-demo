import { useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import {
  applyBrowse,
  clearFilters,
  genresOf,
  hasActiveFilters,
  SORT_OPTIONS,
  toBrowseParams,
  type BrowseState,
  type SortKey,
} from '@/catalog/browse';
import { useBrowseState } from '@/catalog/useBrowseState';
import { useCart } from '@/context/CartContext';
import { useCatalog } from '@/context/CatalogContext';
import { useToast } from '@/context/ToastContext';
import type { AddResult } from '@/context/cart';
import { Filters } from '@/shop/Filters';
import { FiltersDrawer } from '@/shop/FiltersDrawer';
import { ProductCard } from '@/shop/ProductCard';
import { EmptyState, ErrorState, GridSkeleton } from '@/shop/States';
import { EYEBROW, FOCUS_RING, GRID } from '@/shop/styles';

function addMessage(result: AddResult): string {
  if (result.ok) return `Added ${result.record.title} to your cart`;
  switch (result.reason) {
    case 'sold-out':
      return `${result.record.title} is sold out`;
    case 'stock-limit':
      return `Only ${result.record.units} of ${result.record.title} in stock`;
    case 'unknown':
      return 'That record is not available';
  }
}

function countActive(state: BrowseState): number {
  return (
    state.genres.length +
    state.formats.length +
    (state.minPrice !== null || state.maxPrice !== null ? 1 : 0) +
    (state.inStock ? 1 : 0)
  );
}

/** The browse page: search, filters, sort and the product grid. */
export function Home() {
  const catalog = useCatalog();
  const { addToCart: add } = useCart();
  const { toast } = useToast();
  const [state, update] = useBrowseState();

  const records = useMemo(() => (catalog.status === 'ready' ? catalog.records : []), [catalog]);
  const genres = useMemo(() => genresOf(records), [records]);
  const results = useMemo(() => applyBrowse(records, state), [records, state]);
  const active = hasActiveFilters(state);

  const addToCart = useCallback(
    (recordId: string) => toast(addMessage(add(recordId))),
    [add, toast],
  );
  const clear = useCallback(() => update(clearFilters), [update]);
  const clearSearch = toBrowseParams(clearFilters(state)).toString();

  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-10">
      {/* Intro: eyebrow in the narrow column, title pushed into the wide one. */}
      <section className="grid gap-4 pt-14 pb-12 md:grid-cols-[12rem_1fr] md:gap-12 lg:pt-24 lg:pb-16">
        <p className={cn(EYEBROW, 'text-muted-foreground md:pt-4')}>Catalogue · Vinyl</p>
        <div>
          <h1 className="text-5xl/none font-light tracking-tighter sm:text-7xl/none">Records</h1>
          <p className="mt-5 max-w-sm text-sm/relaxed text-muted-foreground">
            New pressings and reissues, from punk to hip-hop. Every record ships in a sleeve and a
            mailer.
          </p>
        </div>
      </section>

      <div className="grid gap-10 md:grid-cols-[12rem_1fr] md:gap-12">
        <aside aria-label="Filters" className="hidden md:block">
          <div className="sticky top-8">
            <Filters state={state} genres={genres} onChange={update} />
          </div>
        </aside>

        <section aria-label="Results" className="min-w-0">
          <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-b pb-4">
            <p aria-live="polite" className="text-sm" data-testid="result-count">
              {catalog.status === 'ready' &&
                `Showing ${results.length} ${results.length === 1 ? 'record' : 'records'}`}
            </p>
            {active && (
              <Link
                to={{ search: clearSearch ? `?${clearSearch}` : '' }}
                replace
                className={cn(FOCUS_RING, 'text-sm underline underline-offset-4')}
              >
                Clear all filters
              </Link>
            )}
            <div className="flex w-full items-center justify-between gap-3 sm:ml-auto sm:w-auto">
              <FiltersDrawer
                className="md:hidden"
                state={state}
                genres={genres}
                onChange={update}
                resultCount={results.length}
                activeCount={countActive(state)}
              />
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sort</span>
                <select
                  value={state.sort}
                  onChange={(event) => update({ sort: event.target.value as SortKey })}
                  className={cn(FOCUS_RING, 'h-9 cursor-pointer bg-transparent pr-1 text-sm')}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {catalog.status === 'loading' && <GridSkeleton />}
          {catalog.status === 'error' && <ErrorState onRetry={catalog.retry} />}
          {catalog.status === 'ready' &&
            (results.length === 0 ? (
              <EmptyState onClear={clear} />
            ) : (
              <ul aria-label="Records" className={GRID}>
                {results.map((record) => (
                  <li key={record.id}>
                    <ProductCard record={record} addToCart={addToCart} />
                  </li>
                ))}
              </ul>
            ))}
        </section>
      </div>
    </div>
  );
}
