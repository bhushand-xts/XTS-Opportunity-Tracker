import * as repository from '../repositories/proposal-sections.repository';

// Business rules and use-case logic for proposal-sections.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
