import { query, transaction } from '../config/db';

// ALL SQL for roles. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface Roles {
  id: number;
}

async function findAll(): Promise<Roles[]> {
  return [];
}

export { findAll };
