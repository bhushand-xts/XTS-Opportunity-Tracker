import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for estimation phases.

export interface PhaseInputLike {
  phaseName?: string | null;
  phaseCode?: string | null;
  description?: string | null;
  displayOrder?: number | null;
}

// Column sizes of mst_estimation_phases — checking here gives a readable
// message instead of a database "value too long" error.
const MAX_NAME = 100;
const MAX_CODE = 50;
const MAX_DESCRIPTION = 500;

function lengthErrors(input: PhaseInputLike): string[] {
  const errors: string[] = [];
  if (input.phaseName && input.phaseName.trim().length > MAX_NAME) {
    errors.push(`Phase Name must be at most ${MAX_NAME} characters`);
  }
  if (input.phaseCode && input.phaseCode.trim().length > MAX_CODE) {
    errors.push(`Phase Code must be at most ${MAX_CODE} characters`);
  }
  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }
  if (input.displayOrder != null && !Number.isInteger(input.displayOrder)) {
    errors.push('Display Order must be a whole number');
  }
  return errors;
}

function assertValidCreate(input: PhaseInputLike): void {
  const errors: string[] = [];
  if (!input.phaseName || !input.phaseName.trim()) errors.push('Phase Name is required');
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: PhaseInputLike): void {
  const errors: string[] = [];
  if ('phaseName' in input && (!input.phaseName || !input.phaseName.trim())) {
    errors.push('Phase Name cannot be empty');
  }
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
