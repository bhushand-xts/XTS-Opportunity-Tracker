import { createContext, useContext } from 'react';

export const FieldValidationContext = createContext<{
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitted: boolean;
  touch: (key: string) => void;
} | null>(null);

export function useFieldValidation(key?: string) {
  const context = useContext(FieldValidationContext);
  return {
    error: key && context && (context.submitted || context.touched[key]) ? context.errors[key] : undefined,
    touch: () => { if (key) context?.touch(key); },
  };
}

export function ValidationMessage({ id, error }: { id: string; error?: string }) {
  return error ? <p id={id} role="alert" className="text-xs text-destructive">{error}</p> : null;
}

export function focusInvalidField(root: HTMLElement | null) {
  requestAnimationFrame(() => {
    const field = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    for (let parent = field?.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
