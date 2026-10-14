import { query } from "../config/db";

export interface AccountType {
  accountTypeId: number;
  accountName: string;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface AccountTypeInput {
  accountName: string;
  description?: string | null;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
}

const SELECT_COLUMNS = `
  account_type_id AS "accountTypeId",
  account_name AS "accountName",
  description,
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<AccountType[]> {
  return query<AccountType>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_account_type
     ORDER BY account_name ASC`
  );
}

async function findById(id: number): Promise<AccountType | null> {
  const rows = await query<AccountType>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_account_type
     WHERE account_type_id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByName(accountName: string, excludeId?: number): Promise<AccountType | null> {
  const rows = excludeId
    ? await query<AccountType>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_account_type
         WHERE LOWER(account_name) = LOWER($1)
           AND account_type_id <> $2`,
        [accountName, excludeId]
      )
    : await query<AccountType>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_account_type
         WHERE LOWER(account_name) = LOWER($1)`,
        [accountName]
      );
  return rows[0] || null;
}

async function create(input: AccountTypeInput, userId: number): Promise<AccountType> {
  const rows = await query<AccountType>(
    `INSERT INTO mst_account_type (account_name, description, created_by, is_active)
     VALUES ($1, $2, $3, COALESCE($4, TRUE))
     RETURNING ${SELECT_COLUMNS}`,
    [input.accountName.trim(), input.description?.trim() ?? null, userId, input.isActive ?? null]
  );
  return rows[0];
}

async function update(id: number, input: Partial<AccountTypeInput>, userId: number | null): Promise<AccountType> {
  const rows = await query<AccountType>(
    `UPDATE mst_account_type
     SET
       account_name = COALESCE($1, account_name),
       description = COALESCE($2, description),
       is_active = COALESCE($3, is_active),
       updated_dt = CURRENT_TIMESTAMP,
       updated_by = $4
     WHERE account_type_id = $5
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.accountName?.trim() ?? null,
      input.description?.trim() ?? null,
      input.isActive ?? null,
      userId,
      id,
    ]
  );
  return rows[0];
}

export { findAll, findById, findByName, create, update };
