import * as repository from '../repositories/roles.repository';
import * as validator from '../validators/roles.validator';
import * as userService from '../integrations/userService';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import type { RoleInput } from '../repositories/roles.repository';

// Business rules and use-case logic for roles.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function get(id: number) {
  const role = await repository.findById(id);
  if (!role) throw notFound('Role not found');
  return role;
}

async function create(input: RoleInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.roleName);
  if (duplicateName) throw conflict('A role with this name already exists');

  if (input.roleCode) {
    const duplicateCode = await repository.findByCode(input.roleCode);
    if (duplicateCode) throw conflict('A role with this code already exists');
  }

  const userId = ctx?.user?.id ?? null;
  return repository.create(input, userId);
}

async function update(id: number, input: Partial<RoleInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Role not found');

  validator.assertValidUpdate(input);

  if (input.roleName) {
    const duplicateName = await repository.findByName(input.roleName, id);
    if (duplicateName) throw conflict('A role with this name already exists');
  }

  if (input.roleCode) {
    const duplicateCode = await repository.findByCode(input.roleCode, id);
    if (duplicateCode) throw conflict('A role with this code already exists');
  }

  const userId = ctx?.user?.id ?? null;
  return repository.update(id, input, userId);
}

async function remove(id: number) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Role not found');

  const usersWithRole = await userService.countUsersByRole(id);
  if (usersWithRole > 0) {
    throw conflict('This role is assigned to one or more users and cannot be deleted');
  }

  await repository.remove(id);
  return true;
}

export { list, get, create, update, remove };
