import { query, transaction } from '../config/db';

// ALL SQL for menus. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface Menus {
  id: number;
}

async function findAll(): Promise<Menus[]> {
  return [];
}

export { findAll };
