import * as repository from '../repositories/role-permissions.repository';

// Business rules and use-case logic for role-permissions.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
