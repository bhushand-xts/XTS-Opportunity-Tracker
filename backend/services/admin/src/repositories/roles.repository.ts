import { recordPreviousVersion } from '../../../../shared/trackerHistory';
import type { PoolClient } from 'pg';

import { query, transaction } from '../config/db';

// ALL SQL for roles. Always use $1 parameters — never string concatenation.
// History contains previous versions only.

// One row of mst_roles_tracker: a snapshot of a role as it stood before an update or deletion.
export interface RoleHistory {
  trackerId: number;
  roleId: number;
  roleName: string;
  roleCode: string | null;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface Role {
  id: number;
  roleName: string;
  roleCode: string | null;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  role_id AS id,
  role_name AS "roleName",
  role_code AS "roleCode",
  description,
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Role[]> {
  const rows = await query<Role>(`SELECT ${SELECT_COLUMNS} FROM mst_roles ORDER BY role_name`);
  return rows;
}

async function findById(id: number): Promise<Role | null> {
  const rows = await query<Role>(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE role_id = $1`, [id]);
  return rows[0] || null;
}

async function findByName(roleName: string, excludeId?: number): Promise<Role | null> {
  const rows = excludeId
    ? await query<Role>(
        `SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_name) = LOWER($1) AND role_id <> $2`,
        [roleName, excludeId]
      )
    : await query<Role>(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_name) = LOWER($1)`, [roleName]);
  return rows[0] || null;
}

async function findByCode(roleCode: string, excludeId?: number): Promise<Role | null> {
  const rows = excludeId
    ? await query<Role>(
        `SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_code) = LOWER($1) AND role_id <> $2`,
        [roleCode, excludeId]
      )
    : await query<Role>(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_code) = LOWER($1)`, [roleCode]);
  return rows[0] || null;
}

export interface RoleInput {
  roleName: string;
  roleCode?: string | null;
  description?: string | null;
  isActive?: boolean;
  // Who is making the change — recorded as created_by / updated_by.
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Updates and deletes archive the previous role in mst_roles_tracker, inside
// the same transaction (README rule 5): the role and its history are saved
// together or not at all. mst_roles.created_dt / is_active are nullable while
// the tracker's are NOT NULL, hence the COALESCEs.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await recordPreviousVersion(client, 'mst_roles', id);
}

// Newest change first.
async function findHistory(roleId: number): Promise<RoleHistory[]> {
  return query<RoleHistory>(
    `SELECT
       tracker_id AS "trackerId",
       role_id AS "roleId",
       role_name AS "roleName",
       role_code AS "roleCode",
       description,
       is_active AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM mst_roles_tracker
     WHERE role_id = $1
     ORDER BY tracker_id DESC`,
    [roleId]
  );
}

async function create(input: RoleInput, userId: number | null): Promise<Role> {
  return transaction(async (client) => {
    const result = await client.query<Role>(
      `INSERT INTO mst_roles (role_name, role_code, description, is_active, created_by)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
       RETURNING ${SELECT_COLUMNS}`,
      [input.roleName, input.roleCode ?? null, input.description ?? null, input.isActive ?? null, userId]
    );
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<RoleInput>, userId: number | null): Promise<Role> {
  return transaction(async (client) => {
    await recordTracker(client, id);
    const result = await client.query<Role>(
      `UPDATE mst_roles SET
         role_name = COALESCE($1, role_name),
         role_code = CASE WHEN $2::boolean THEN $3 ELSE role_code END,
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         is_active = COALESCE($6, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $7
       WHERE role_id = $8
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.roleName ?? null,
        'roleCode' in input,
        input.roleCode ?? null,
        'description' in input,
        input.description ?? null,
        input.isActive ?? null,
        userId,
        id,
      ]
    );
    return result.rows[0];
  });
}

// Archive the previous role before deletion; history survives the main row.
async function remove(id: number, userId: number | null): Promise<void> {
  await transaction(async (client) => {
    await recordTracker(client, id);
    await client.query('DELETE FROM mst_roles WHERE role_id = $1', [id]);
  });
}

export { findAll, findById, findByName, findByCode, findHistory, create, update, remove };
