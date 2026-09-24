import { query } from "../config/db";
import {
  CreateMenuInput,
  UpdateMenuInput
} from "../validators/menus.validator";

export interface MenuRecord {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  createdDt: Date;
  createdBy: number;
  updatedDt: Date | null;
  updatedBy: number | null;
  isActive: boolean;
  children?: MenuRecord[];
}
export interface SidebarMenuRecord {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  children?: SidebarMenuRecord[];
}
export interface UserMenuPermissionRecord {
  menuId: number;
  menuName: string;
  menuKey: string;
  parentId: number | null;
  permissionId: number;
  permissionName: string;
  permissionKey: string;
}
export interface UserPermissionRecord {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
}
export class MenusRepository {

  async findAll(
    isActive?: boolean
  ): Promise<MenuRecord[]> {

    let sql = `
      SELECT
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_menus
    `;

    const params: unknown[] = [];

    if (isActive !== undefined) {
      sql += ` WHERE is_active = $1`;
      params.push(isActive);
    }

    sql += `
      ORDER BY
        sort_order ASC,
        menu_id ASC
    `;

    const result = await query<MenuRecord>(sql, params);

    return result;
  }

  async findById(
    menuId: number
  ): Promise<MenuRecord | null> {

    const result = await query<MenuRecord>(
      `
      SELECT
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_menus
      WHERE menu_id = $1
      `,
      [menuId]
    );

    return result[0] || null;
  }

  async findByKey(
    menuKey: string
  ): Promise<MenuRecord | null> {

    const result = await query<MenuRecord>(
      `
      SELECT
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_menus
      WHERE menu_key = $1
      `,
      [menuKey]
    );

    return result[0] || null;
  }

  async findByNameAndParent(
    menuName: string,
    parentId: number | null
  ): Promise<MenuRecord | null> {

    const result = await query<MenuRecord>(
      `
      SELECT
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_menus
      WHERE LOWER(menu_name) = LOWER($1)
        AND parent_id IS NOT DISTINCT FROM $2
      `,
      [menuName, parentId]
    );

    return result[0] || null;
  }

  async findBySortOrderAndParent(
    sortOrder: number,
    parentId: number | null
  ): Promise<MenuRecord | null> {

    const result = await query<MenuRecord>(
      `
      SELECT
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      FROM mst_menus
      WHERE sort_order = $1
        AND parent_id IS NOT DISTINCT FROM $2
      `,
      [sortOrder, parentId]
    );

    return result[0] || null;
  }

  async hasActiveChildren(
    menuId: number
  ): Promise<boolean> {

    const result = await query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM mst_menus
      WHERE parent_id = $1
        AND is_active = TRUE
      `,
      [menuId]
    );

    return Number(result[0].count) > 0;
  }

  async create(
    input: CreateMenuInput
  ): Promise<MenuRecord> {

    try {
      const result = await query<MenuRecord>(
        `
        INSERT INTO mst_menus
        (
          menu_name,
          menu_key,
          icon,
          parent_id,
          sort_order,
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
          CURRENT_TIMESTAMP,
          $6,
          TRUE
        )
        RETURNING
          menu_id AS "menuId",
          menu_name AS "menuName",
          menu_key AS "menuKey",
          icon,
          parent_id AS "parentId",
          sort_order AS "sortOrder",
          created_dt AS "createdDt",
          created_by AS "createdBy",
          updated_dt AS "updatedDt",
          updated_by AS "updatedBy",
          is_active AS "isActive"
        `,
        [
          input.menuName.trim(),
          input.menuKey.trim(),
          input.icon ?? null,
          input.parentId ?? null,
          input.sortOrder,
          input.createdBy
        ]
      );

      return result[0];

    } catch (error: any) {

      if (error.code === "23505") {
        throw new Error(
          "A menu with this menu key already exists."
        );
      }

      throw error;
    }
  }

  async update(
    menuId: number,
    input: UpdateMenuInput
  ): Promise<MenuRecord> {

    const result = await query<MenuRecord>(
      `
      UPDATE mst_menus
      SET
        menu_name = COALESCE($1, menu_name),
        menu_key = COALESCE($2, menu_key),
        icon = CASE
          WHEN $3::boolean = TRUE THEN $4
          ELSE icon
        END,
        parent_id = CASE
          WHEN $5::boolean = TRUE THEN $6
          ELSE parent_id
        END,
        sort_order = COALESCE($7, sort_order),
        updated_dt = CURRENT_TIMESTAMP,
        updated_by = $8
      WHERE menu_id = $9
      RETURNING
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      `,
      [
        input.menuName ?? null,
        input.menuKey ?? null,

        input.icon !== undefined,
        input.icon ?? null,

        input.parentId !== undefined,
        input.parentId ?? null,

        input.sortOrder ?? null,
        input.updatedBy,
        menuId
      ]
    );

    if (!result[0]) {
      throw new Error("Menu not found.");
    }

    return result[0];
  }

  async updateStatus(
    menuId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<MenuRecord> {

    const result = await query<MenuRecord>(
      `
      UPDATE mst_menus
      SET
        is_active = $1,
        updated_dt = CURRENT_TIMESTAMP,
        updated_by = $2
      WHERE menu_id = $3
      RETURNING
        menu_id AS "menuId",
        menu_name AS "menuName",
        menu_key AS "menuKey",
        icon,
        parent_id AS "parentId",
        sort_order AS "sortOrder",
        created_dt AS "createdDt",
        created_by AS "createdBy",
        updated_dt AS "updatedDt",
        updated_by AS "updatedBy",
        is_active AS "isActive"
      `,
      [
        isActive,
        updatedBy,
        menuId
      ]
    );

    if (!result[0]) {
      throw new Error("Menu not found.");
    }

    return result[0];
  }
    async findSidebarByUserId(
  userId: number
): Promise<SidebarMenuRecord[]> {

  const result = await query<SidebarMenuRecord>(
    `
    WITH RECURSIVE user_role AS (
      SELECT role_id
      FROM mst_user
      WHERE user_id = $1
        AND is_active = TRUE
    ),

    allowed_menus AS (
      SELECT DISTINCT
        m.menu_id,
        m.menu_name,
        m.menu_key,
        m.icon,
        m.parent_id,
        m.sort_order
      FROM mst_menus m
      INNER JOIN tbl_role_menu_permission rmp
        ON rmp.menu_id = m.menu_id
       AND rmp.is_active = TRUE

      INNER JOIN user_role ur
        ON ur.role_id = rmp.role_id

      INNER JOIN mst_permissions p
        ON p.permission_id = rmp.permission_id
       AND p.is_active = TRUE

      WHERE m.is_active = TRUE
    ),

    sidebar_menus AS (
      SELECT
        menu_id,
        menu_name,
        menu_key,
        icon,
        parent_id,
        sort_order
      FROM allowed_menus

      UNION

      SELECT
        m.menu_id,
        m.menu_name,
        m.menu_key,
        m.icon,
        m.parent_id,
        m.sort_order
      FROM mst_menus m
      INNER JOIN sidebar_menus sm
        ON sm.parent_id = m.menu_id
      WHERE m.is_active = TRUE
    )

    SELECT DISTINCT
      menu_id AS "menuId",
      menu_name AS "menuName",
      menu_key AS "menuKey",
      icon,
      parent_id AS "parentId",
      sort_order AS "sortOrder"
    FROM sidebar_menus
    ORDER BY
      sort_order ASC,
      menu_id ASC
    `,
    [userId]
  );

  return result;
}
async findUserMenus(userId: number): Promise<SidebarMenuRecord[]> {
  const result = await query<SidebarMenuRecord>(
    `
    WITH RECURSIVE user_role AS (
      SELECT role_id
      FROM mst_user
      WHERE user_id = $1
        AND is_active = TRUE
    ),

    allowed_menus AS (
      SELECT DISTINCT
        m.menu_id,
        m.menu_name,
        m.menu_key,
        m.icon,
        m.parent_id,
        m.sort_order
      FROM mst_menus m
      INNER JOIN tbl_role_menu_permission rmp
        ON rmp.menu_id = m.menu_id
       AND rmp.is_active = TRUE
      INNER JOIN user_role ur
        ON ur.role_id = rmp.role_id
      WHERE m.is_active = TRUE
    ),

    sidebar_menus AS (
      SELECT
        menu_id,
        menu_name,
        menu_key,
        icon,
        parent_id,
        sort_order
      FROM allowed_menus

      UNION

      SELECT
        m.menu_id,
        m.menu_name,
        m.menu_key,
        m.icon,
        m.parent_id,
        m.sort_order
      FROM mst_menus m
      INNER JOIN sidebar_menus sm
        ON sm.parent_id = m.menu_id
      WHERE m.is_active = TRUE
    )

    SELECT DISTINCT
      menu_id AS "menuId",
      menu_name AS "menuName",
      menu_key AS "menuKey",
      icon,
      parent_id AS "parentId",
      sort_order AS "sortOrder"
    FROM sidebar_menus
    ORDER BY
      sort_order ASC,
      menu_id ASC
    `,
    [userId]
  );

  return result;
}
async findMenuPermissions(
  userId: number,
  menuId: number
): Promise<UserPermissionRecord[]> {

  const result = await query<UserPermissionRecord>(
    `
    SELECT
      p.permission_id AS "permissionId",
      p.permission_name AS "permissionName",
      p.permission_key AS "permissionKey"
    FROM mst_user u
    INNER JOIN tbl_role_menu_permission rmp
      ON rmp.role_id = u.role_id
     AND rmp.is_active = TRUE
    INNER JOIN mst_menus m
      ON m.menu_id = rmp.menu_id
     AND m.is_active = TRUE
    INNER JOIN mst_permissions p
      ON p.permission_id = rmp.permission_id
     AND p.is_active = TRUE
    WHERE u.user_id = $1
      AND u.is_active = TRUE
      AND m.menu_id = $2
    ORDER BY
      p.permission_id
    `,
    [userId, menuId]
  );

  return result;
}
}