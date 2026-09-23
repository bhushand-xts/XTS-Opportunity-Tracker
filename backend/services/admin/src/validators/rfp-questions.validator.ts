import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for RFP questions.

export interface RfpQuestionInputLike {
  question?: string | null;
  description?: string | null;
  displayOrder?: number | null;
}

// Column sizes of mst_rfp_questions — checking here gives a readable message
// instead of a database "value too long" error.
const MAX_QUESTION = 500;
const MAX_DESCRIPTION = 500;

function lengthErrors(input: RfpQuestionInputLike): string[] {
  const errors: string[] = [];
  if (input.question && input.question.trim().length > MAX_QUESTION) {
    errors.push(`Question must be at most ${MAX_QUESTION} characters`);
  }
  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }
  if (input.displayOrder != null && !Number.isInteger(input.displayOrder)) {
    errors.push('Display Order must be a whole number');
  }
  return errors;
}

function assertValidCreate(input: RfpQuestionInputLike): void {
  const errors: string[] = [];
  if (!input.question || !input.question.trim()) errors.push('Question is required');
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: RfpQuestionInputLike): void {
  const errors: string[] = [];
  if ('question' in input && (!input.question || !input.question.trim())) {
    errors.push('Question cannot be empty');
  }
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
