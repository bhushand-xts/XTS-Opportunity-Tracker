import * as repository from '../repositories/stage.repository';

// Business rules and use-case logic for stage.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
