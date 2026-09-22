import * as repository from '../repositories/user.repository';
import * as adminService from '../integrations/adminService';

// Business rules and use-case logic for user.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function countByRole(roleId: number) {
  return repository.countByRole(roleId);
}

// Gives a user one role, or removes it (roleId null). The role must exist and be
// active — checked with the admin service, which owns roles. `actorId` is the
// signed-in user making the change (recorded as updated_by).
async function assignRole(userId: number, roleId: number | null, actorId: number | undefined) {
  if (!actorId) throw new Error('You must be signed in to make changes.');

  const user = await repository.findSummaryById(userId);
  if (!user) throw new Error('User not found.');
  if (!user.isActive) throw new Error('The role of an inactive user cannot be changed.');

  if (roleId !== null) {
    const role = await adminService.findRole(roleId);
    if (!role) throw new Error('Role not found.');
    if (!role.isActive) throw new Error('This role is inactive and cannot be assigned.');
  }

  return repository.setRole(userId, roleId, actorId);
}

export { list, countByRole, assignRole };
