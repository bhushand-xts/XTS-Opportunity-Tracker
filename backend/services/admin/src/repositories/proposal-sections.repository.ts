import { query, transaction } from '../config/db';

// ALL SQL for proposal-sections. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface ProposalSections {
  id: number;
}

async function findAll(): Promise<ProposalSections[]> {
  return [];
}

export { findAll };
