import * as repository from '../repositories/opportunity.repository';
import * as validator from '../validators/opportunity.validator';

// Business rules and use-case logic for opportunity.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

export { list };
