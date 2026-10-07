import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { parseBrowseParams, toBrowseParams, type BrowseState } from './browse';

/**
 * Browse state backed by the URL query string. Updates replace the history entry,
 * so typing and toggling do not flood the back button.
 *
 * The router commits URL changes in a transition, which would make controlled checkboxes
 * snap back until it lands. A local copy updates at once and follows the URL afterwards.
 */
export function useBrowseState() {
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState(() => parseBrowseParams(params));
  const [seenParams, setSeenParams] = useState(params);
  if (params !== seenParams) {
    setSeenParams(params);
    setLocal(parseBrowseParams(params));
  }

  const update = useCallback(
    (change: Partial<BrowseState> | ((prev: BrowseState) => BrowseState)) => {
      const next = typeof change === 'function' ? change(local) : { ...local, ...change };
      setLocal(next);
      setParams(toBrowseParams(next), { replace: true });
    },
    [local, setParams],
  );

  return [local, update] as const;
}
