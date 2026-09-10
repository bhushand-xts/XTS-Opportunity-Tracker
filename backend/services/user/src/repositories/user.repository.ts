import { query, transaction } from '../config/db';

// ALL SQL for user. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface User {
  id: number;
}

async function findAll(): Promise<User[]> {
  return [];
}

export { findAll };
