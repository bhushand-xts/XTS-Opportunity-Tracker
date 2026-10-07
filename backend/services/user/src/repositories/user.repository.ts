import { query } from '../config/db';

// ALL SQL for user. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  passwordHash: string;
  roleId: number | null;
}

// A user as shown in the user list: no password hash, plus the assigned role.
export interface UserSummary {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roleId: number | null;
  isActive: boolean;
}

const SUMMARY_COLUMNS = `
  user_id AS id,
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  role_id AS "roleId",
  COALESCE(is_active, TRUE) AS "isActive"
`;

async function findAll(): Promise<UserSummary[]> {
  return query<UserSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM mst_user ORDER BY LOWER(COALESCE(first_name, '')), LOWER(COALESCE(last_name, '')), user_id`
  );
}

async function findSummaryById(userId: number): Promise<UserSummary | null> {
  const rows = await query<UserSummary>(`SELECT ${SUMMARY_COLUMNS} FROM mst_user WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}

// One role per user (mst_user.role_id). Pass null to remove the user's role.
async function setRole(userId: number, roleId: number | null, updatedBy: number): Promise<UserSummary> {
  const rows = await query<UserSummary>(
    `UPDATE mst_user
     SET role_id = $2, updated_dt = CURRENT_TIMESTAMP, updated_by = $3
     WHERE user_id = $1
     RETURNING ${SUMMARY_COLUMNS}`,
    [userId, roleId, updatedBy]
  );
  return rows[0];
}

async function findByEmail(email: string): Promise<User | null> {
  const rows = await query<User>(
    'SELECT user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash", role_id AS "roleId" FROM mst_user WHERE LOWER(email) = LOWER($1) AND is_active = TRUE',
    [email]
  );
  return rows[0] ?? null;
}

async function createUser(firstName: string, lastName: string, email: string, passwordHash: string): Promise<User> {
  const rows = await query<User>(
    'INSERT INTO mst_user (first_name, last_name, email, password_hash) VALUES ($1, $2, LOWER($3), $4) RETURNING user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash", role_id AS "roleId"',
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

async function createSession(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
  await query('INSERT INTO auth_session (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
}

// Who a login token belongs to. Only a live session counts: not expired, and the
// user still active. Returns null for an unknown or expired token.
async function findUserIdByTokenHash(tokenHash: string): Promise<number | null> {
  const rows = await query<{ id: number }>(
    `SELECT u.user_id AS id
     FROM auth_session s
     INNER JOIN mst_user u ON u.user_id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = TRUE`,
    [tokenHash]
  );
  return rows[0]?.id ?? null;
}

async function countByRole(roleId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM mst_user WHERE role_id = $1',
    [roleId]
  );
  return Number(rows[0]?.count ?? 0);
}

export { findAll, findSummaryById, setRole, findByEmail, createUser, createSession, findUserIdByTokenHash, countByRole };
