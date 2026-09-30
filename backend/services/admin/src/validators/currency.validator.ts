import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface CurrencyInputLike {
  currencyName?: string | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
}

const MAX_NAME = 100;
const MAX_CODE = 10;
const MAX_SYMBOL = 10;

function lengthErrors(input: CurrencyInputLike): string[] {
  const errors: string[] = [];

  if (input.currencyName && input.currencyName.trim().length > MAX_NAME) {
    errors.push(`Currency Name must be at most ${MAX_NAME} characters`);
  }

  if (input.currencyCode && input.currencyCode.trim().length > MAX_CODE) {
    errors.push(`Currency Code must be at most ${MAX_CODE} characters`);
  }

  if (input.currencySymbol && input.currencySymbol.trim().length > MAX_SYMBOL) {
    errors.push(`Currency Symbol must be at most ${MAX_SYMBOL} characters`);
  }

  return errors;
}

function assertValidCreate(input: CurrencyInputLike): void {
  const errors: string[] = [];

  if (!input.currencyName || !input.currencyName.trim()) {
    errors.push("Currency Name is required");
  }

  if (!input.currencyCode || !input.currencyCode.trim()) {
    errors.push("Currency Code is required");
  }

  if (!input.currencySymbol || !input.currencySymbol.trim()) {
    errors.push("Currency Symbol is required");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

function assertValidUpdate(input: CurrencyInputLike): void {
  const errors: string[] = [];

  if ("currencyName" in input && (!input.currencyName || !input.currencyName.trim())) {
    errors.push("Currency Name cannot be empty");
  }

  if ("currencyCode" in input && (!input.currencyCode || !input.currencyCode.trim())) {
    errors.push("Currency Code cannot be empty");
  }

  if ("currencySymbol" in input && (!input.currencySymbol || !input.currencySymbol.trim())) {
    errors.push("Currency Symbol cannot be empty");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export { assertValidCreate, assertValidUpdate };