import type { PoolClient } from "pg";

import { query, transaction } from "../config/db";

import {
  CreatePermissionInput,
  UpdatePermissionInput
} from "../validators/permissions.validator";

// One row of mst_permissions_tracker: a snapshot of a permission as it
// stood after a change.
export interface PermissionHistoryRecord {
  trackerId: number;
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  isActive: boolean;
  createdDt: Date;
  createdBy: number | null;
  updatedDt: Date | null;
  updatedBy: number | null;
}

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

export interface MenuPermissionMappingRecord {
  id: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  permissionName: string;
  permissionKey: string;
  createdDt: Date;
  createdBy: number;
  updatedDt: Date | null;
  updatedBy: number | null;
}

const permissionFields = `
  permission_id AS "permissionId",
  permission_name AS "permissionName",
  permission_key AS "permissionKey",
  description,
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy",
  is_active AS "isActive"
`;

// Every write to mst_permissions also writes a snapshot of the resulting row
// to mst_permissions_tracker — always inside the caller's transaction, so the
// record and its history are saved together or not at all.
async function recordTracker(
  client: PoolClient,
  permissionId: number
): Promise<void> {

  await client.query(
    `
    INSERT INTO mst_permissions_tracker
      (permission_id, permission_name, permission_key, description,
       created_dt, created_by, updated_dt, updated_by, is_active)
    SELECT
      permission_id, permission_name, permission_key, description,
      created_dt, created_by, updated_dt, updated_by, is_active
    FROM mst_permissions
    WHERE permission_id = $1
    `,
    [permissionId]
  );
}

export class PermissionsRepository {

  // --------------------------------------------------
  // PERMISSION MANAGEMENT
  // --------------------------------------------------

  // Newest change first.
  async findHistory(
    permissionId: number
  ): Promise<PermissionHistoryRecord[]> {

    return query<PermissionHistoryRecord>(
      `
      SELECT
        tracker_id AS "trackerId",
        permission_id AS "permissionId",
        permission_name AS "permissionName",
        permission_key AS "permissionKey",
        description,
        is_active AS "isActive",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy"
      FROM mst_permissions_tracker
      WHERE permission_id = $1
      ORDER BY tracker_id DESC
      `,
      [permissionId]
    );
  }

  async findAll(): Promise<PermissionRecord[]> {

    const result =
      await query<PermissionRecord>(
        `
        SELECT
          ${permissionFields}
        FROM mst_permissions
        ORDER BY
          permission_name ASC,
          permission_id ASC
        `
      );

    return result;
  }

  async findById(
    permissionId: number
  ): Promise<PermissionRecord | null> {

    const result =
      await query<PermissionRecord>(
        `
        SELECT
          ${permissionFields}
        FROM mst_permissions
        WHERE permission_id = $1
        `,
        [permissionId]
      );

    return result[0] || null;
  }

  async findByKey(
    permissionKey: string
  ): Promise<PermissionRecord | null> {

    const result =
      await query<PermissionRecord>(
        `
        SELECT
          ${permissionFields}
        FROM mst_permissions
        WHERE permission_key = $1
        `,
        [permissionKey]
      );

    return result[0] || null;
  }

  async findByName(
    permissionName: string
  ): Promise<PermissionRecord | null> {

    const result =
      await query<PermissionRecord>(
        `
        SELECT
          ${permissionFields}
        FROM mst_permissions
        WHERE LOWER(permission_name) = LOWER($1)
        `,
        [permissionName]
      );

    return result[0] || null;
  }

  async create(
    input: CreatePermissionInput
  ): Promise<PermissionRecord> {

    try {

      return await transaction(async (client) => {

        const result =
          await client.query<PermissionRecord>(
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
              ${permissionFields}
            `,
            [
              input.permissionName.trim(),
              input.permissionKey.trim(),
              input.description ?? null,
              input.createdBy
            ]
          );

        await recordTracker(client, result.rows[0].permissionId);

        return result.rows[0];
      });

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

    return transaction(async (client) => {

      const result =
        await client.query<PermissionRecord>(
          `
          UPDATE mst_permissions
          SET
            permission_name = COALESCE($1, permission_name),

            permission_key = COALESCE($2, permission_key),

            description = CASE
              WHEN $3::boolean = TRUE THEN $4
              ELSE description
            END,

            updated_dt = CURRENT_TIMESTAMP,
            updated_by = $5

          WHERE permission_id = $6

          RETURNING
            ${permissionFields}
          `,
          [
            input.permissionName ?? null,
            input.permissionKey ?? null,
            input.description !== undefined,
            input.description ?? null,
            input.updatedBy,
            permissionId
          ]
        );

      if (!result.rows[0]) {
        throw new Error("Permission not found.");
      }

      await recordTracker(client, permissionId);

      return result.rows[0];
    });
  }

  async updateStatus(
    permissionId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<PermissionRecord> {

    return transaction(async (client) => {

      const result =
        await client.query<PermissionRecord>(
          `
          UPDATE mst_permissions
          SET
            is_active = $1,
            updated_dt = CURRENT_TIMESTAMP,
            updated_by = $2
          WHERE permission_id = $3
          RETURNING
            ${permissionFields}
          `,
          [
            isActive,
            updatedBy,
            permissionId
          ]
        );

      if (!result.rows[0]) {
        throw new Error("Permission not found.");
      }

      await recordTracker(client, permissionId);

      return result.rows[0];
    });
  }


  // --------------------------------------------------
  // MENU-PERMISSION MAPPING
  // --------------------------------------------------

  async getMenuListForMapping(): Promise<{
    menuId: number;
    menuName: string;
  }[]> {

    const result =
      await query<{
        menuId: number;
        menuName: string;
      }>(
        `
        SELECT
          menu_id AS "menuId",
          menu_name AS "menuName"
        FROM mst_menus
        WHERE is_active = TRUE
        ORDER BY
          sort_order ASC,
          menu_name ASC
        `
      );

    return result;
  }


  async getMenuPermissions(
    menuId: number
  ): Promise<PermissionRecord[]> {

    const result =
      await query<PermissionRecord>(
        `
        SELECT
          p.permission_id AS "permissionId",
          p.permission_name AS "permissionName",
          p.permission_key AS "permissionKey",
          p.description,
          p.created_dt AS "createdDt",
          p.created_by AS "createdBy",
          p.updated_dt AS "updatedDt",
          p.updated_by AS "updatedBy",
          p.is_active AS "isActive"

        FROM tbl_menuwise_permission mp

        INNER JOIN mst_permissions p
          ON p.permission_id = mp.permission_id

        WHERE mp.menu_id = $1

        ORDER BY
          p.permission_name ASC
        `,
        [menuId]
      );

    return result;
  }


  async getMenuPermissionMappings():
    Promise<MenuPermissionMappingRecord[]> {

    const result =
      await query<MenuPermissionMappingRecord>(
        `
        SELECT
          mp.id,
          mp.menu_id AS "menuId",
          mp.permission_id AS "permissionId",

          m.menu_name AS "menuName",

          p.permission_name AS "permissionName",
          p.permission_key AS "permissionKey",

          mp.created_dt AS "createdDt",
          mp.created_by AS "createdBy",
          mp.updated_dt AS "updatedDt",
          mp.updated_by AS "updatedBy"

        FROM tbl_menuwise_permission mp

        INNER JOIN mst_menus m
          ON m.menu_id = mp.menu_id

        INNER JOIN mst_permissions p
          ON p.permission_id = mp.permission_id

        ORDER BY
          m.menu_name ASC,
          p.permission_name ASC
        `
      );

    return result;
  }


  async menuExists(
    menuId: number
  ): Promise<boolean> {

    const result =
      await query(
        `
        SELECT 1
        FROM mst_menus
        WHERE menu_id = $1
          AND is_active = TRUE
        `,
        [menuId]
      );

    return result.length > 0;
  }


  async permissionExists(
    permissionId: number
  ): Promise<boolean> {

    const result =
      await query(
        `
        SELECT 1
        FROM mst_permissions
        WHERE permission_id = $1
          AND is_active = TRUE
        `,
        [permissionId]
      );

    return result.length > 0;
  }


  async saveMenuPermissions(
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<void> {

    /*
      One transaction, so a failure part-way can never leave the menu
      with a half-saved permission set.

      1. Remove the menu's existing mapping.
      2. Insert the selected permissions.
      3. Revoke any role grant for a permission this menu no longer allows —
         addRoleMenuPermissions refuses such grants, so keeping old ones
         would leave roles holding access the menu does not offer.
    */

    await transaction(async (client) => {

      await client.query(
        `
        DELETE FROM tbl_menuwise_permission
        WHERE menu_id = $1
        `,
        [menuId]
      );

      for (const permissionId of permissionIds) {

        await client.query(
          `
          INSERT INTO tbl_menuwise_permission
          (
            menu_id,
            permission_id,
            created_dt,
            created_by
          )
          VALUES
          (
            $1,
            $2,
            CURRENT_TIMESTAMP,
            $3
          )
          `,
          [
            menuId,
            permissionId,
            updatedBy
          ]
        );
      }

      await client.query(
        `
        UPDATE tbl_role_menu_permission
        SET
          is_active = FALSE,
          updated_dt = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE menu_id = $2
          AND is_active = TRUE
          AND permission_id <> ALL($3::int[])
        `,
        [
          updatedBy,
          menuId,
          permissionIds
        ]
      );
    });
  }
}