import * as repository from '../repositories/phases.repository';

// Business rules and use-case logic for phases.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
