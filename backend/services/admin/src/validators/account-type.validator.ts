import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface AccountTypeInputLike {
  accountName?: string | null;
  description?: string | null;
}

const MIN_NAME = 3;
const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
// Letters, numbers, spaces, and -, /, & — nothing else. Mirrors
// accountType.schema.ts on the frontend; kept here too so the rule holds
// even for a caller that skips the UI.
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-/&]*$/;

function lengthErrors(input: AccountTypeInputLike): string[] {
  const errors: string[] = [];

  if (input.accountName) {
    const trimmed = input.accountName.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_NAME) {
      errors.push("Must be at least 3 characters long.");
    }
    if (trimmed.length > MAX_NAME) {
      errors.push(`Account Type Name must be at most ${MAX_NAME} characters`);
    }
    if (trimmed.length > 0 && !ALLOWED_CHARS.test(trimmed)) {
      errors.push("Only letters, numbers, spaces, hyphens (-), slashes (/) and ampersands (&) are allowed.");
    }
  }

  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }

  return errors;
}

function assertValidCreate(input: AccountTypeInputLike): void {
  const errors: string[] = [];

  if (!input.accountName || !input.accountName.trim()) {
    errors.push("Account Type Name is required.");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

function assertValidUpdate(input: AccountTypeInputLike): void {
  const errors: string[] = [];

  if ("accountName" in input && (!input.accountName || !input.accountName.trim())) {
    errors.push("Account Type Name is required.");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export { assertValidCreate, assertValidUpdate };
