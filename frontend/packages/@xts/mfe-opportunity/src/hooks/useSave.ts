import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { randomUUID } from '../lib/uuid';

export type ConfirmationTone = 'success' | 'warning' | 'error' | 'info';

/** One mutation at a time. Retain idempotency keys for identical retries. */
export function useSave() {
  const locked = useRef(false);
  const keys = useRef(new Map<string, string>());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  async function run<T>(signature: string, mutate: (idempotencyKey: string) => Promise<T>, onSuccess: (saved: T) => void, message: string | null = 'Changes saved.', tone: ConfirmationTone = 'success') {
    if (locked.current) return;
    locked.current = true; setSaving(true); setError(undefined);
    let key = keys.current.get(signature);
    if (!key) { key = randomUUID(); keys.current.set(signature, key); }
    try {
      const saved = await mutate(key);
      keys.current.delete(signature);
      onSuccess(saved);
      if (message !== null) toast[tone](message);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'Saving failed. Please retry.';
      setError(detail); toast.error(detail);
    } finally { locked.current = false; setSaving(false); }
  }
  return { saving, error, run };
}
