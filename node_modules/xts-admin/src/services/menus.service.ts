import * as repository from '../repositories/menus.repository';

// Business rules and use-case logic for menus.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
