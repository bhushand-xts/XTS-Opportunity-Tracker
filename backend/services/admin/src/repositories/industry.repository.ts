import { query } from "../config/db";

export interface Industry {
  industryId: number;
  industryName: string;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface IndustryInput {
  industryName: string;
  description?: string | null;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
}

const SELECT_COLUMNS = `
  industry_id AS "industryId",
  industry_name AS "industryName",
  description,
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Industry[]> {
  return query<Industry>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_industry
     ORDER BY industry_name ASC`
  );
}

async function findById(id: number): Promise<Industry | null> {
  const rows = await query<Industry>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_industry
     WHERE industry_id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByName(industryName: string, excludeId?: number): Promise<Industry | null> {
  const rows = excludeId
    ? await query<Industry>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_industry
         WHERE LOWER(industry_name) = LOWER($1)
           AND industry_id <> $2`,
        [industryName, excludeId]
      )
    : await query<Industry>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_industry
         WHERE LOWER(industry_name) = LOWER($1)`,
        [industryName]
      );
  return rows[0] || null;
}

async function create(input: IndustryInput, userId: number): Promise<Industry> {
  const rows = await query<Industry>(
    `INSERT INTO mst_industry (industry_name, description, created_by, is_active)
     VALUES ($1, $2, $3, COALESCE($4, TRUE))
     RETURNING ${SELECT_COLUMNS}`,
    [input.industryName.trim(), input.description?.trim() ?? null, userId, input.isActive ?? null]
  );
  return rows[0];
}

async function update(id: number, input: Partial<IndustryInput>, userId: number | null): Promise<Industry> {
  const rows = await query<Industry>(
    `UPDATE mst_industry
     SET
       industry_name = COALESCE($1, industry_name),
       description = COALESCE($2, description),
       is_active = COALESCE($3, is_active),
       updated_dt = CURRENT_TIMESTAMP,
       updated_by = $4
     WHERE industry_id = $5
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.industryName?.trim() ?? null,
      input.description?.trim() ?? null,
      input.isActive ?? null,
      userId,
      id,
    ]
  );
  return rows[0];
}

export { findAll, findById, findByName, create, update };
