import { query, transaction } from '../config/db';

// ALL SQL for rate-master. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface RateMaster {
  id: number;
}

async function findAll(): Promise<RateMaster[]> {
  return [];
}

export { findAll };
