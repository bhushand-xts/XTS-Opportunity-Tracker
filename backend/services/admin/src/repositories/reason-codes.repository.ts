import { query, transaction } from '../config/db';

// ALL SQL for reason-codes. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface ReasonCodes {
  id: number;
}

async function findAll(): Promise<ReasonCodes[]> {
  return [];
}

export { findAll };
