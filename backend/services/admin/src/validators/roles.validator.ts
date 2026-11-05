import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for roles.

export interface RoleInputLike {
  roleName?: string | null;
  roleCode?: string | null;
  description?: string | null;
}

// Column sizes of mst_roles — checking here gives a readable message instead
// of a database "value too long" error.
const MAX_NAME = 100;
const MAX_CODE = 50;
const MAX_DESCRIPTION = 100;

function lengthErrors(input: RoleInputLike): string[] {
  const errors: string[] = [];
  if (input.roleName && input.roleName.trim().length > MAX_NAME) {
    errors.push(`Role Name must be at most ${MAX_NAME} characters`);
  }
  if (input.roleCode && input.roleCode.trim().length > MAX_CODE) {
    errors.push(`Role Code must be at most ${MAX_CODE} characters`);
  }
  if (input.description && input.description.length > MAX_DESCRIPTION) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION} characters`);
  }
  return errors;
}

function assertValidCreate(input: RoleInputLike): void {
  const errors: string[] = [];
  if (!input.roleName || !input.roleName.trim()) errors.push('Role Name is required');
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: RoleInputLike): void {
  const errors: string[] = [];
  if ('roleName' in input && (!input.roleName || !input.roleName.trim())) {
    errors.push('Role Name cannot be empty');
  }
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
