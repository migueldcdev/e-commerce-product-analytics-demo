import { Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { cn } from 'cn';

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Header search. Writes ?q= 300 ms after the last keystroke, or at once on Enter.
 * On any page but the browse page it navigates there.
 */
export function SearchBar({ className }: { className?: string }) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const urlQuery = params.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);

  // Follow the URL when it changes elsewhere, e.g. "Clear all filters" or back/forward.
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    if (value.trim() !== urlQuery) setValue(urlQuery);
  }

  const commit = useCallback(
    (query: string) => {
      const onBrowse = pathname === '/';
      const next = onBrowse ? new URLSearchParams(params) : new URLSearchParams();
      if (query) next.set('q', query);
      else next.delete('q');
      const search = next.toString();
      void navigate({ pathname: '/', search: search ? `?${search}` : '' }, { replace: onBrowse });
    },
    [navigate, params, pathname],
  );

  useEffect(() => {
    const query = value.trim();
    if (query === urlQuery) return;
    const timer = setTimeout(() => commit(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, commit]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() !== urlQuery) commit(value.trim());
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        aria-label="Search records"
        placeholder="Artist, title or genre"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full border-0 border-b border-border bg-transparent pr-2 pl-7 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:shadow-[0_1px_0_0_var(--foreground)]"
      />
    </form>
  );
}
