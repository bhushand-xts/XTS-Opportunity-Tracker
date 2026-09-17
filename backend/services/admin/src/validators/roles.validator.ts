import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for roles.

export interface RoleInputLike {
  roleName?: string | null;
  roleCode?: string | null;
}

function assertValidCreate(input: RoleInputLike): void {
  const errors: string[] = [];
  if (!input.roleName || !input.roleName.trim()) errors.push('Role Name is required');
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: RoleInputLike): void {
  const errors: string[] = [];
  if ('roleName' in input && (!input.roleName || !input.roleName.trim())) {
    errors.push('Role Name cannot be empty');
  }
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
