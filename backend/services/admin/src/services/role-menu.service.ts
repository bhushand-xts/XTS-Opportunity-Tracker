import * as repository from '../repositories/role-menu.repository';

// Business rules and use-case logic for role-menu.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
