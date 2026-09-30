import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface IndustryInputLike {
  industryName?: string | null;
  description?: string | null;
}

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

function lengthErrors(input: IndustryInputLike): string[] {
  const errors: string[] = [];

  if (input.industryName && input.industryName.trim().length > MAX_NAME) {
    errors.push(`Industry Name must be at most ${MAX_NAME} characters`);
  }

  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }

  return errors;
}

function assertValidCreate(input: IndustryInputLike): void {
  const errors: string[] = [];

  if (!input.industryName || !input.industryName.trim()) {
    errors.push("Industry Name is required");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

function assertValidUpdate(input: IndustryInputLike): void {
  const errors: string[] = [];

  if ("industryName" in input && (!input.industryName || !input.industryName.trim())) {
    errors.push("Industry Name cannot be empty");
  }

  errors.push(...lengthErrors(input));

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export { assertValidCreate, assertValidUpdate };
