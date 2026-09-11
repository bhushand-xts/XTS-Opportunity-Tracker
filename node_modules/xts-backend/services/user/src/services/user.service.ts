import * as repository from '../repositories/user.repository';
import * as validator from '../validators/user.validator';

// Business rules and use-case logic for user.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function countByRole(roleId: number) {
  return repository.countByRole(roleId);
}

export { list, countByRole };
