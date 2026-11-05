import { createContext, useContext } from 'react';

export const FieldValidationContext = createContext<Record<string, string>>({});
export function useFieldError(label: string) {
  return useContext(FieldValidationContext)[label];
}
