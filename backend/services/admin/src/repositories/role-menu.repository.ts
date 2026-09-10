import { query, transaction } from '../config/db';

// ALL SQL for role-menu. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface RoleMenu {
  id: number;
}

async function findAll(): Promise<RoleMenu[]> {
  return [];
}

export { findAll };
