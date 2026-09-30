import { query, transaction } from '../config/db';

// ALL SQL for sub-stages. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface SubStages {
  id: number;
}

async function findAll(): Promise<SubStages[]> {
  return [];
}

export { findAll };
