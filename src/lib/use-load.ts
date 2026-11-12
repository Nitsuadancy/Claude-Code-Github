import { useEffect, useState } from 'react';

/**
 * Loads something from the server for one screen (the team tools), with
 * loading and error states, and a reload for pull-to-refresh and after
 * changes. Pass null to load nothing (backend off). `key` names what's
 * loaded; a new key loads again.
 */
export function useLoad<T>(load: (() => Promise<T>) | null, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!load);

  const settle = (p: Promise<T>) =>
    p.then(
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : 'Couldn’t load. Pull down to try again.');
        setLoading(false);
      },
    );

  useEffect(() => {
    if (load) void settle(load());
    // Loads once per key; the loader itself is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!load]);

  const reload = async () => {
    if (load) await settle(load());
  };
  return { data, error, loading, reload };
}
