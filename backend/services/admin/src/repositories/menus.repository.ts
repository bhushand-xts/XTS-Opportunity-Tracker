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

    return result.rows;
  }

  async findById(menuId: number): Promise<MenuRecord | null> {

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

    return result.rows[0] || null;
  }

  async findByKey(menuKey: string): Promise<MenuRecord | null> {

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

    return result.rows[0] || null;
  }

  async hasActiveChildren(menuId: number): Promise<boolean> {

    const result = await query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM mst_menus
      WHERE parent_id = $1
        AND is_active = TRUE
      `,
      [menuId]
    );

    return Number(result.rows[0].count) > 0;
  }

  async create(input: CreateMenuInput): Promise<MenuRecord> {

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

      return result.rows[0];

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
        is_active = COALESCE($8, is_active),
        updated_dt = CURRENT_TIMESTAMP,
        updated_by = $9
      WHERE menu_id = $10
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
        input.isActive ?? null,
        input.updatedBy,
        menuId
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Menu not found.");
    }

    return result.rows[0];
  }

  // async softDelete(
  //   menuId: number,
  //   updatedBy: number
  // ): Promise<MenuRecord> {

  //   const result = await query<MenuRecord>(
  //     `
  //     UPDATE mst_menus
  //     SET
  //       is_active = FALSE,
  //       updated_dt = CURRENT_TIMESTAMP,
  //       updated_by = $2
  //     WHERE menu_id = $1
  //     RETURNING
  //       menu_id AS "menuId",
  //       menu_name AS "menuName",
  //       menu_key AS "menuKey",
  //       icon,
  //       parent_id AS "parentId",
  //       sort_order AS "sortOrder",
  //       created_dt AS "createdDt",
  //       created_by AS "createdBy",
  //       updated_dt AS "updatedDt",
  //       updated_by AS "updatedBy",
  //       is_active AS "isActive"
  //     `,
  //     [menuId, updatedBy]
  //   );

  //   if (!result.rows[0]) {
  //     throw new Error("Menu not found.");
  //   }

  //   return result.rows[0];
  // }
}