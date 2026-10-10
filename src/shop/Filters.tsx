import { useId, type ReactNode } from 'react';
import { cn } from 'cn';
import type { BrowseState } from '@/catalog/browse';
import { FORMATS } from '@/catalog/types';
import { EYEBROW, FOCUS_RING } from './styles';

interface FiltersProps {
  state: BrowseState;
  genres: readonly string[];
  onChange: (change: Partial<BrowseState>) => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function readPrice(raw: string): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/** The filter controls. Rendered in the sidebar on desktop and in the drawer on mobile. */
export function Filters({ state, genres, onChange }: FiltersProps) {
  return (
    <div className="flex flex-col gap-10">
      <FilterGroup legend="Genre">
        {genres.map((genre) => (
          <Check
            key={genre}
            label={genre}
            checked={state.genres.includes(genre)}
            onChange={() => onChange({ genres: toggle(state.genres, genre) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup legend="Format">
        {FORMATS.map((format) => (
          <Check
            key={format}
            label={format}
            checked={state.formats.includes(format)}
            onChange={() => onChange({ formats: toggle(state.formats, format) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup legend="Price">
        <div className="flex items-end gap-3">
          <PriceInput
            label="Min price"
            short="Min"
            value={state.minPrice}
            onChange={(minPrice) => onChange({ minPrice })}
          />
          <span aria-hidden="true" className="pb-2 text-muted-foreground">
            –
          </span>
          <PriceInput
            label="Max price"
            short="Max"
            value={state.maxPrice}
            onChange={(maxPrice) => onChange({ maxPrice })}
          />
        </div>
      </FilterGroup>

      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        In stock only
        <input
          type="checkbox"
          role="switch"
          checked={state.inStock}
          onChange={(event) => onChange({ inStock: event.target.checked })}
          className={cn(
            FOCUS_RING,
            'relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-zinc-500 transition-colors checked:bg-foreground',
            'before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-background before:transition-transform checked:before:translate-x-4',
          )}
        />
      </label>
    </div>
  );
}

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className={cn(EYEBROW, 'mb-4 text-muted-foreground')}>{legend}</legend>
      <div className="flex flex-col gap-2.5">{children}</div>
    </fieldset>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={cn(FOCUS_RING, 'size-4 shrink-0 cursor-pointer accent-foreground')}
      />
      <span className="group-has-checked:font-medium">{label}</span>
    </label>
  );
}

function PriceInput({
  label,
  short,
  value,
  onChange,
}: {
  label: string;
  short: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
        <span aria-hidden="true">{short}</span>
        <span className="sr-only">{label} in euros</span>
      </label>
      <div className="flex items-baseline border-b border-border focus-within:border-foreground focus-within:shadow-[0_1px_0_0_var(--foreground)]">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value ?? ''}
          onChange={(event) => onChange(readPrice(event.target.value))}
          className="h-9 w-full min-w-0 [appearance:textfield] bg-transparent text-sm tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span aria-hidden="true" className="pl-1 text-sm text-muted-foreground">
          €
        </span>
      </div>
    </div>
  );
}
