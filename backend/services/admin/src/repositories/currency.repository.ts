import { query } from "../config/db";

export interface Currency {
  currencyId: number;
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface CurrencyInput {
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
}

const SELECT_COLUMNS = `
  currency_id AS "currencyId",
  currency_name AS "currencyName",
  currency_code AS "currencyCode",
  currency_symbol AS "currencySymbol",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Currency[]> {
  return query<Currency>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_currency
     ORDER BY currency_name ASC`
  );
}

async function findById(id: number): Promise<Currency | null> {
  const rows = await query<Currency>(
    `SELECT ${SELECT_COLUMNS}
     FROM mst_currency
     WHERE currency_id = $1`,
    [id]
  );

  return rows[0] || null;
}

async function findByCode(
  currencyCode: string,
  excludeId?: number
): Promise<Currency | null> {
  const rows = excludeId
    ? await query<Currency>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_currency
         WHERE LOWER(currency_code) = LOWER($1)
           AND currency_id <> $2`,
        [currencyCode, excludeId]
      )
    : await query<Currency>(
        `SELECT ${SELECT_COLUMNS}
         FROM mst_currency
         WHERE LOWER(currency_code) = LOWER($1)`,
        [currencyCode]
      );

  return rows[0] || null;
}


async function create(
  input: CurrencyInput,
  userId: number
): Promise<Currency> {
  const rows = await query<Currency>(
    `INSERT INTO mst_currency
      (
        currency_name,
        currency_code,
        currency_symbol,
        created_by,
        is_active
      )
     VALUES
      ($1, UPPER($2), $3, $4, COALESCE($5, TRUE))
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.currencyName.trim(),
      input.currencyCode.trim(),
      input.currencySymbol.trim(),
      userId,
      input.isActive ?? null
    ]
  );

  return rows[0];
}

async function update(
  id: number,
  input: Partial<CurrencyInput>,
  userId: number | null
): Promise<Currency> {
  const rows = await query<Currency>(
    `UPDATE mst_currency
     SET
       currency_name = COALESCE($1, currency_name),
       currency_code = COALESCE(UPPER($2), currency_code),
       currency_symbol = COALESCE($3, currency_symbol),
       is_active = COALESCE($4, is_active),
       updated_dt = CURRENT_TIMESTAMP,
       updated_by = $5
     WHERE currency_id = $6
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.currencyName?.trim() ?? null,
      input.currencyCode?.trim() ?? null,
      input.currencySymbol?.trim() ?? null,
      input.isActive ?? null,
      userId,
      id
    ]
  );

  return rows[0];
}

async function isUsed(id: number): Promise<boolean> {
  // Add real usage checks here when currency_id is used in transaction tables.
  return false;
}

async function remove(id: number): Promise<void> {
  await query(
    `DELETE FROM mst_currency
     WHERE currency_id = $1`,
    [id]
  );
}

export {
  findAll,
  findById,
  findByCode,
  create,
  update,
  isUsed,
  remove
};