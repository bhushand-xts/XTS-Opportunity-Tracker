import * as repository from '../repositories/roles.repository';

// Business rules and use-case logic for roles.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
