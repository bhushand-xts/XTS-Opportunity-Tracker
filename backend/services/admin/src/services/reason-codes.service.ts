import * as repository from '../repositories/reason-codes.repository';

// Business rules and use-case logic for reason-codes.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
