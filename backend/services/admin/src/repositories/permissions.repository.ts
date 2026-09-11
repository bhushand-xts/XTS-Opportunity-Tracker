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

export class PermissionsRepository {

  // --------------------------------------------------
  // PERMISSION MANAGEMENT
  // --------------------------------------------------

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

    return result.rows;
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

    return result.rows[0] || null;
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

    return result.rows[0] || null;
  }

  async create(
    input: CreatePermissionInput
  ): Promise<PermissionRecord> {

    try {

      const result =
        await query<PermissionRecord>(
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

    const result =
      await query<PermissionRecord>(
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

    return result.rows[0];
  }

  async updateStatus(
    permissionId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<PermissionRecord> {

    const result =
      await query<PermissionRecord>(
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

    return result.rows[0];
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

    return result.rows;
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

        FROM tbl_menu_permission mp

        INNER JOIN mst_permissions p
          ON p.permission_id = mp.permission_id

        WHERE mp.menu_id = $1

        ORDER BY
          p.permission_name ASC
        `,
        [menuId]
      );

    return result.rows;
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

        FROM tbl_menu_permission mp

        INNER JOIN mst_menus m
          ON m.menu_id = mp.menu_id

        INNER JOIN mst_permissions p
          ON p.permission_id = mp.permission_id

        ORDER BY
          m.menu_name ASC,
          p.permission_name ASC
        `
      );

    return result.rows;
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

    return result.rows.length > 0;
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

    return result.rows.length > 0;
  }


  async saveMenuPermissions(
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<void> {

    /*
      First remove the existing mapping
      for this menu.

      Then insert the currently selected
      permissions.
    */

    await query(
      `
      DELETE FROM tbl_menu_permission
      WHERE menu_id = $1
      `,
      [menuId]
    );

    for (const permissionId of permissionIds) {

      await query(
        `
        INSERT INTO tbl_menu_permission
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
  }
}