import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(enabled);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(), request = ++generation.current;
    setData(undefined); setError(undefined); setLoading(enabled);
    if (enabled) {
      load(controller.signal).then(value => {
        if (!controller.signal.aborted && request === generation.current) setData(value);
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted && request === generation.current) setError(cause instanceof Error ? cause : new Error('The request failed. Please retry.'));
      }).finally(() => { if (!controller.signal.aborted && request === generation.current) setLoading(false); });
    }
    return () => controller.abort();
  }, [load, enabled, revision]);
  const reload = useCallback(() => setRevision(x => x + 1), []);
  return { data, error, loading, reload, setData };
}

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}
