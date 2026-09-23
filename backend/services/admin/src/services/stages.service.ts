import * as repository from '../repositories/stages.repository';

// Business rules and use-case logic for stages.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
