import { query, transaction } from '../config/db';

// ALL SQL for permissions. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface Permissions {
  id: number;
}

async function findAll(): Promise<Permissions[]> {
  return [];
}

export { findAll };
