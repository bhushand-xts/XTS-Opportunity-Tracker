import { query, transaction } from '../config/db';

// ALL SQL for opportunity. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface Opportunity {
  id: number;
}

async function findAll(): Promise<Opportunity[]> {
  return [];
}

export { findAll };
