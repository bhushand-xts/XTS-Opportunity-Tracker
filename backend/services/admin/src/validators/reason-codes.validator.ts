import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for reason codes.

export interface ReasonCodeInputLike {
  reasonName?: string | null;
  description?: string | null;
  displayOrder?: number | null;
}

// Column sizes of tbl_reason_codes — checking here gives a readable message
// instead of a database "value too long" error. description is a `text`
// column (unbounded) but still capped here for a sane UI limit.
const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

function lengthErrors(input: ReasonCodeInputLike): string[] {
  const errors: string[] = [];
  if (input.reasonName && input.reasonName.trim().length > MAX_NAME) {
    errors.push(`Reason Code Name must be at most ${MAX_NAME} characters`);
  }
  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }
  if (input.displayOrder != null && !Number.isInteger(input.displayOrder)) {
    errors.push('Display Order must be a whole number');
  }
  return errors;
}

function assertValidCreate(input: ReasonCodeInputLike): void {
  const errors: string[] = [];
  if (!input.reasonName || !input.reasonName.trim()) errors.push('Reason Code Name is required');
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: ReasonCodeInputLike): void {
  const errors: string[] = [];
  if ('reasonName' in input && (!input.reasonName || !input.reasonName.trim())) {
    errors.push('Reason Code Name cannot be empty');
  }
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
