import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface IndustryInputLike {
  industryName?: string | null;
  description?: string | null;
}

const MIN_NAME = 2;
const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
// Letters, numbers, spaces, and -, /, & — nothing else. Blocks HTML/injection
// characters like < > { } [ ] $ % as a side effect of the allow-list. Mirrors
// industry.schema.ts on the frontend; kept here too so the rule holds even
// for a caller that skips the UI.
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-/&]*$/;

function lengthErrors(input: IndustryInputLike): string[] {
  const errors: string[] = [];

  if (input.industryName) {
    const trimmed = input.industryName.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_NAME) {
      errors.push("Industry name must be at least 2 characters long.");
    }
    if (trimmed.length > MAX_NAME) {
      errors.push(`Industry Name must be at most ${MAX_NAME} characters`);
    }
    if (trimmed.length > 0 && !ALLOWED_CHARS.test(trimmed)) {
      errors.push("Invalid characters detected.");
    }
  }

  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }

  return errors;
}

function assertValidCreate(input: IndustryInputLike): void {
  const errors: string[] = [];

  if (!input.industryName || !input.industryName.trim()) {
    errors.push("Industry Name is required.");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

function assertValidUpdate(input: IndustryInputLike): void {
  const errors: string[] = [];

  if ("industryName" in input && (!input.industryName || !input.industryName.trim())) {
    errors.push("Industry Name is required.");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export { assertValidCreate, assertValidUpdate };
