import { query, transaction } from "../config/db";

import {
  CreateRateMasterInput,
  UpdateRateMasterInput
} from "../validators/rate-master.validator";


export interface RateMasterRecord {
  ratemasterId: number;
  roleName: string;
  roleCode: string;
  currencyId: number;
  rateType: string;
  defaultRate: number;
  location: string | null;
  description: string | null;
  createdDt: Date;
  createdBy: number;
  updatedDt: Date | null;
  updatedBy: number | null;
  isActive: boolean;
}


const rateMasterFields = `
  ratemaster_id AS "ratemasterId",
  role_name AS "roleName",
  role_code AS "roleCode",
  currency_id AS "currencyId",
  rate_type AS "rateType",
  default_rate AS "defaultRate",
  location,
  description,
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy",
  is_active AS "isActive"
`;


export class RateMasterRepository {

  // --------------------------------------------------
  // GET ALL
  // --------------------------------------------------

  async findAll(): Promise<RateMasterRecord[]> {

    return query<RateMasterRecord>(
      `
      SELECT
        ${rateMasterFields}
      FROM mst_rate
      ORDER BY
        role_name ASC,
        ratemaster_id ASC
      `
    );
  }


  // --------------------------------------------------
  // GET BY ID
  // --------------------------------------------------

  async findById(
    ratemasterId: number
  ): Promise<RateMasterRecord | null> {

    const result =
      await query<RateMasterRecord>(
        `
        SELECT
          ${rateMasterFields}
        FROM mst_rate
        WHERE ratemaster_id = $1
        `,
        [ratemasterId]
      );

    return result[0] || null;
  }


  // --------------------------------------------------
  // DUPLICATE CHECK
  // --------------------------------------------------

  async findDuplicate(
    roleName: string,
    roleCode: string,
    excludeId?: number
  ): Promise<RateMasterRecord | null> {

    const result =
      await query<RateMasterRecord>(
        `
        SELECT
          ${rateMasterFields}
        FROM mst_rate
        WHERE
          (
            LOWER(role_name) = LOWER($1)
            OR LOWER(role_code) = LOWER($2)
          )
          AND (
            $3::integer IS NULL
            OR ratemaster_id <> $3
          )
        LIMIT 1
        `,
        [
          roleName,
          roleCode,
          excludeId ?? null
        ]
      );

    return result[0] || null;
  }


  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------

async create(input: CreateRateMasterInput): Promise<RateMasterRecord> {
  try {
    return await transaction(async (client) => {
      const result =
        await client.query<RateMasterRecord>(
          `
          INSERT INTO mst_rate
          (
            role_name,
            role_code,
            currency_id,
            rate_type,
            default_rate,
            location,
            description,
            created_dt,
            created_by,
            is_active
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            CURRENT_TIMESTAMP,
            $8,
            TRUE
          )
          RETURNING
            ${rateMasterFields}
          `,
          [
            input.roleName.trim(),
            input.roleCode.trim(),
            input.currencyId,            input.rateType.trim(),
            input.defaultRate,
            input.location?.trim() || null,
            input.description?.trim() || null,
            input.createdBy
          ]
        );

      const created = result.rows[0];

      await client.query(
        `
        INSERT INTO mst_rate_tracker
        (
          ratemaster_id,
          role_name,
          role_code,
          currency_id,
          rate_type,
          default_rate,
          location,
          description,
          created_dt,
          created_by,
          updated_dt,
          updated_by,
          is_active
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        )
        `,
        [
          created.ratemasterId,
          created.roleName,
          created.roleCode,
          created.currencyId,
          created.rateType,
          created.defaultRate,
          created.location,
          created.description,
          created.createdDt,
          created.createdBy,
          created.updatedDt,
          created.updatedBy,
          created.isActive
        ]
      );

      return created;
    });
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error(
        "This technical role configuration already exists."
      );
    }
    throw error;
  }
}


  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------

async update(
  ratemasterId: number,
  input: UpdateRateMasterInput
): Promise<RateMasterRecord> {
  return transaction(async (client) => {
    const result =
      await client.query<RateMasterRecord>(
        `
        UPDATE mst_rate
        SET
          role_name = $1,
          role_code = $2,
          currency_id = $3,
          rate_type = $4,
          default_rate = $5,
          location = $6,
          description = $7,
          updated_dt = CURRENT_TIMESTAMP,
          updated_by = $8
        WHERE ratemaster_id = $9
        RETURNING
          ${rateMasterFields}
        `,
        [
          input.roleName.trim(),
          input.roleCode.trim(),
          input.currencyId,
          input.rateType.trim(),
          input.defaultRate,
          input.location?.trim() || null,
          input.description?.trim() || null,
          input.updatedBy,
          ratemasterId
        ]
      );

    const updated = result.rows[0];

    if (!updated) {
      throw new Error("Rate master not found.");
    }

    await client.query(
      `
      INSERT INTO mst_rate_tracker
      (
        ratemaster_id,
        role_name,
        role_code,
        currency_id,
        rate_type,
        default_rate,
        location,
        description,
        created_dt,
        created_by,
        updated_dt,
        updated_by,
        is_active
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      `,
      [
        updated.ratemasterId,
        updated.roleName,
        updated.roleCode,
        updated.currencyId,
        updated.rateType,
        updated.defaultRate,
        updated.location,
        updated.description,
        updated.createdDt,
        updated.createdBy,
        updated.updatedDt,
        updated.updatedBy,
        updated.isActive
      ]
    );

    return updated;
  });
}

async updateStatus(
  ratemasterId: number,
  isActive: boolean,
  updatedBy: number
): Promise<RateMasterRecord> {
  return transaction(async (client) => {
    const result =
      await client.query<RateMasterRecord>(
        `
        UPDATE mst_rate
        SET
          is_active = $1,
          updated_dt = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE ratemaster_id = $3
        RETURNING
          ${rateMasterFields}
        `,
        [isActive, updatedBy, ratemasterId]
      );

    const updated = result.rows[0];

    if (!updated) {
      throw new Error("Rate master not found.");
    }

    await client.query(
      `
      INSERT INTO mst_rate_tracker
      (
        ratemaster_id,
        role_name,
        role_code,
        currency_id,
        rate_type,
        default_rate,
        location,
        description,
        created_dt,
        created_by,
        updated_dt,
        updated_by,
        is_active
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      `,
      [
        updated.ratemasterId,
        updated.roleName,
        updated.roleCode,
        updated.currencyId,
        updated.rateType,
        updated.defaultRate,
        updated.location,
        updated.description,
        updated.createdDt,
        updated.createdBy,
        updated.updatedDt,
        updated.updatedBy,
        updated.isActive
      ]
    );

    return updated;
  });
}
}