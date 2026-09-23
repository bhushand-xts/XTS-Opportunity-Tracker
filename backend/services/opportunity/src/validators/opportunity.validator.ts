import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for opportunity.

function assertValid(input: Record<string, any>): void {
  const errors: string[] = [];
  // if (!input.name) errors.push('name is required');
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValid };
