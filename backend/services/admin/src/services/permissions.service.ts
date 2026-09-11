import * as repository from '../repositories/permissions.repository';

// Business rules and use-case logic for permissions.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
