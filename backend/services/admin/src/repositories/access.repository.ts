import { query } from "../config/db";

export interface RoleMenuPermissionRecord {
  id: number;
  roleId: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  menuKey: string;
  permissionName: string;
  permissionKey: string;
  createdDt: Date;
  createdBy: number;
  updatedDt: Date | null;
  updatedBy: number | null;
}

export class AccessRepository {

  // Menus a role currently has access to, with permissions grouped per menu
  async getRoleAccess(roleId: number): Promise<RoleMenuPermissionRecord[]> {

    const result = await query<RoleMenuPermissionRecord>(
      `
      SELECT
        rmp.id,
        rmp.role_id AS "roleId",
        rmp.menu_id AS "menuId",
        rmp.permission_id AS "permissionId",
        m.menu_name AS "menuName",
        m.menu_key AS "menuKey",
        p.permission_name AS "permissionName",
        p.permission_key AS "permissionKey",
        rmp.created_dt AS "createdDt",
        rmp.created_by AS "createdBy",
        rmp.updated_dt AS "updatedDt",
        rmp.updated_by AS "updatedBy"
      FROM tbl_role_menu_permission rmp
      INNER JOIN mst_menus m ON m.menu_id = rmp.menu_id
      INNER JOIN mst_permissions p ON p.permission_id = rmp.permission_id
      WHERE rmp.role_id = $1 AND rmp.is_active = TRUE
      ORDER BY m.menu_name ASC, p.permission_name ASC
      `,
      [roleId]
    );

    return result;
  }

  // Permissions a role has for one specific menu (used to pre-check ticked boxes in UI)
  async getRoleMenuPermissions(
    roleId: number,
    menuId: number
  ): Promise<RoleMenuPermissionRecord[]> {

    const result = await query<RoleMenuPermissionRecord>(
      `
      SELECT
        rmp.id,
        rmp.role_id AS "roleId",
        rmp.menu_id AS "menuId",
        rmp.permission_id AS "permissionId",
        m.menu_name AS "menuName",
        m.menu_key AS "menuKey",
        p.permission_name AS "permissionName",
        p.permission_key AS "permissionKey",
        rmp.created_dt AS "createdDt",
        rmp.created_by AS "createdBy",
        rmp.updated_dt AS "updatedDt",
        rmp.updated_by AS "updatedBy"
      FROM tbl_role_menu_permission rmp
      INNER JOIN mst_menus m ON m.menu_id = rmp.menu_id
      INNER JOIN mst_permissions p ON p.permission_id = rmp.permission_id
      WHERE rmp.role_id = $1 AND rmp.menu_id = $2 AND rmp.is_active = TRUE
      `,
      [roleId, menuId]
    );

    return result;
  }

  // Permissions available to tick for a given menu (sourced from tbl_menuwise_permission)
  async getAvailablePermissionsForMenu(menuId: number) {

    const result = await query<{
      permissionId: number;
      permissionName: string;
      permissionKey: string;
    }>(
      `
      SELECT
        p.permission_id AS "permissionId",
        p.permission_name AS "permissionName",
        p.permission_key AS "permissionKey"
      FROM tbl_menuwise_permission mp
      INNER JOIN mst_permissions p ON p.permission_id = mp.permission_id
      WHERE mp.menu_id = $1 AND mp.is_active = TRUE
      ORDER BY p.permission_name ASC
      `,
      [menuId]
    );

    return result;
  }

  async roleExists(roleId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM mst_roles WHERE role_id = $1 AND is_active = TRUE`,
      [roleId]
    );
    return result.length > 0;
  }

  async menuExists(menuId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM mst_menus WHERE menu_id = $1 AND is_active = TRUE`,
      [menuId]
    );
    return result.length > 0;
  }

  // Only allow ticking permissions that are actually valid for this menu
  async permissionValidForMenu(menuId: number, permissionId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM tbl_menuwise_permission WHERE menu_id = $1 AND permission_id = $2 AND is_active = TRUE`,
      [menuId, permissionId]
    );
    return result.length > 0;
  }

  async addRoleMenuPermissions(
    roleId: number,
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<void> {

    for (const permissionId of permissionIds) {
      await query(
        `
        INSERT INTO tbl_role_menu_permission
          (role_id, menu_id, permission_id, created_dt, created_by, is_active)
        VALUES
          ($1, $2, $3, CURRENT_TIMESTAMP, $4, TRUE)
        ON CONFLICT (role_id, menu_id, permission_id)
        DO UPDATE SET
          is_active = TRUE,
          updated_dt = CURRENT_TIMESTAMP,
          updated_by = $4
        `,
        [roleId, menuId, permissionId, updatedBy]
      );
    }
  }

  async removeRoleMenuPermissions(
    roleId: number,
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<void> {

    if (permissionIds.length === 0) return;

    await query(
      `
      UPDATE tbl_role_menu_permission
      SET is_active = FALSE, updated_dt = CURRENT_TIMESTAMP, updated_by = $1
      WHERE role_id = $2 AND menu_id = $3 AND permission_id = ANY($4::int[])
      `,
      [updatedBy, roleId, menuId, permissionIds]
    );
  }
}