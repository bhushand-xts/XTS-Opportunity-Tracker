import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, enabled = true, refreshInterval = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(enabled);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(), request = ++generation.current;
    setData(undefined); setError(undefined); setLoading(enabled);
    let fetching = false;
    const fetchData = () => {
      if (!enabled || fetching || controller.signal.aborted) return;
      fetching = true;
      load(controller.signal).then(value => {
        if (!controller.signal.aborted && request === generation.current) { setData(value); setError(undefined); }
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted && request === generation.current) setError(cause instanceof Error ? cause : new Error('The request failed. Please retry.'));
      }).finally(() => { fetching = false; if (!controller.signal.aborted && request === generation.current) setLoading(false); });
    };
    fetchData();
    const refresh = () => { if (document.visibilityState === 'visible') fetchData(); };
    const timer = enabled && refreshInterval > 0 ? window.setInterval(refresh, refreshInterval) : undefined;
    if (timer !== undefined) window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, enabled, revision, refreshInterval]);
  const reload = useCallback(() => setRevision(x => x + 1), []);
  return { data, error, loading, reload, setData };
}

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}
