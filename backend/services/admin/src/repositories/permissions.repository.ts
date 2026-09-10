import { query } from "../config/db";
import {
  CreatePermissionInput,
  UpdatePermissionInput
} from "../validators/permissions.validator";

export interface PermissionRecord {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  createdDt: Date;
  createdBy: number;
  updatedDt: Date | null;
  updatedBy: number | null;
  isActive: boolean;
}

export class PermissionsRepository {

  async findAll(
    isActive?: boolean
  ): Promise<PermissionRecord[]> {

    let sql = `
      SELECT
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_permissions
    `;

    const params: unknown[] = [];

    if (isActive !== undefined) {
      sql += ` WHERE is_active = $1`;
      params.push(isActive);
    }

    sql += `
      ORDER BY
        permission_name ASC,
        permission_id ASC
    `;

    const result = await query<PermissionRecord>(
      sql,
      params
    );

    return result.rows;
  }

  async findById(
    permissionId: number
  ): Promise<PermissionRecord | null> {

    const result = await query<PermissionRecord>(
      `
      SELECT
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_permissions
      WHERE permission_id = $1
      `,
      [permissionId]
    );

    return result.rows[0] || null;
  }

  async findByKey(
    permissionKey: string
  ): Promise<PermissionRecord | null> {

    const result = await query<PermissionRecord>(
      `
      SELECT
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_permissions
      WHERE permission_key = $1
      `,
      [permissionKey]
    );

    return result.rows[0] || null;
  }

  async create(
    input: CreatePermissionInput
  ): Promise<PermissionRecord> {

    try {

      const result = await query<PermissionRecord>(
        `
        INSERT INTO mst_permissions
        (
          permission_name,
          permission_key,
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
          CURRENT_TIMESTAMP,
          $4,
          TRUE
        )
        RETURNING
          permission_id AS "permissionId",
          permission_name AS "permissionName",
          permission_key AS "permissionKey",
          description,
          created_dt AS "createdDt",
          created_by AS "createdBy",
          updated_dt AS "updatedDt",
          updated_by AS "updatedBy",
          is_active AS "isActive"
        `,
        [
          input.permissionName.trim(),
          input.permissionKey.trim(),
          input.description ?? null,
          input.createdBy
        ]
      );

      return result.rows[0];

    } catch (error: any) {

      if (error.code === "23505") {
        throw new Error(
          "A permission with this permission key already exists."
        );
      }

      throw error;
    }
  }

  async update(
    permissionId: number,
    input: UpdatePermissionInput
  ): Promise<PermissionRecord> {

    const result = await query<PermissionRecord>(
      `
      UPDATE mst_permissions
      SET
        permission_name = COALESCE($1, permission_name),
        permission_key = COALESCE($2, permission_key),
        description = CASE
          WHEN $3::boolean = TRUE THEN $4
          ELSE description
        END,
        is_active = COALESCE($5, is_active),
        updated_dt = CURRENT_TIMESTAMP,
        updated_by = $6
      WHERE permission_id = $7
      RETURNING
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      `,
      [
        input.permissionName ?? null,
        input.permissionKey ?? null,

        input.description !== undefined,
        input.description ?? null,

        input.isActive ?? null,
        input.updatedBy,
        permissionId
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Permission not found.");
    }

    return result.rows[0];
  }

  async softDelete(
    permissionId: number,
    updatedBy: number
  ): Promise<PermissionRecord> {

    const result = await query<PermissionRecord>(
      `
      UPDATE mst_permissions
      SET
        is_active = FALSE,
        updated_dt = CURRENT_TIMESTAMP,
        updated_by = $2
      WHERE permission_id = $1
      RETURNING
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      `,
      [permissionId, updatedBy]
    );

    if (!result.rows[0]) {
      throw new Error("Permission not found.");
    }

    return result.rows[0];
  }
}