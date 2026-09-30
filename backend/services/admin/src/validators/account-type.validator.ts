import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface AccountTypeInputLike {
  accountName?: string | null;
  description?: string | null;
}

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

function lengthErrors(input: AccountTypeInputLike): string[] {
  const errors: string[] = [];

  if (input.accountName && input.accountName.trim().length > MAX_NAME) {
    errors.push(`Account Name must be at most ${MAX_NAME} characters`);
  }

  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }

  return errors;
}

function assertValidCreate(input: AccountTypeInputLike): void {
  const errors: string[] = [];

  if (!input.accountName || !input.accountName.trim()) {
    errors.push("Account Name is required");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

function assertValidUpdate(input: AccountTypeInputLike): void {
  const errors: string[] = [];

  if ("accountName" in input && (!input.accountName || !input.accountName.trim())) {
    errors.push("Account Name cannot be empty");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export { assertValidCreate, assertValidUpdate };
