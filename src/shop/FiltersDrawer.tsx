import { SlidersHorizontal } from 'lucide-react';
import { cn } from 'cn';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { BrowseState } from '@/catalog/browse';
import { Filters } from './Filters';
import { FOCUS_RING } from './styles';

interface FiltersDrawerProps {
  state: BrowseState;
  genres: readonly string[];
  onChange: (change: Partial<BrowseState>) => void;
  resultCount: number;
  activeCount: number;
  className?: string;
}

/** Mobile: the same filters in a drawer from the left. */
export function FiltersDrawer({
  state,
  genres,
  onChange,
  resultCount,
  activeCount,
  className,
}: FiltersDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          FOCUS_RING,
          'inline-flex h-9 items-center gap-2 border px-3 text-sm',
          className,
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.5} />
        Filters
        {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] gap-0 sm:max-w-sm">
        <SheetHeader className="px-6 pt-10 pb-6">
          <SheetTitle className="text-3xl font-light tracking-tight">Filters</SheetTitle>
          <SheetDescription className="sr-only">Narrow the records shown.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <Filters state={state} genres={genres} onChange={onChange} />
        </div>
        <SheetFooter className="border-t px-6 py-6">
          <SheetClose
            className={cn(
              FOCUS_RING,
              'h-12 w-full bg-foreground text-sm font-medium text-background',
            )}
          >
            Show {resultCount} {resultCount === 1 ? 'record' : 'records'}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
