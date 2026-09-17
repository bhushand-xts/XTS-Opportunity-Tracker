import { query } from '../config/db';

// ALL SQL for user. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  passwordHash: string;
}

async function findAll(): Promise<User[]> {
  return [];
}

async function findByEmail(email: string): Promise<User | null> {
  const rows = await query<User>(
    'SELECT user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash" FROM mst_user WHERE LOWER(email) = LOWER($1) AND is_active = TRUE',
    [email]
  );
  return rows[0] ?? null;
}

async function createUser(firstName: string, lastName: string, email: string, passwordHash: string): Promise<User> {
  const rows = await query<User>(
    'INSERT INTO mst_user (first_name, last_name, email, password_hash) VALUES ($1, $2, LOWER($3), $4) RETURNING user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash"',
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

async function createSession(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
  await query('INSERT INTO auth_session (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
}

async function countByRole(roleId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM mst_user WHERE role_id = $1',
    [roleId]
  );
  return Number(rows[0]?.count ?? 0);
}

export { findAll, findByEmail, createUser, createSession, countByRole };
