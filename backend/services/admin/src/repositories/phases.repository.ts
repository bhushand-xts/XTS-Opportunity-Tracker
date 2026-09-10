import { query, transaction } from '../config/db';

// ALL SQL for phases. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface Phases {
  id: number;
}

async function findAll(): Promise<Phases[]> {
  return [];
}

export { findAll };
