"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenusRepository = void 0;
const db_1 = require("../config/db");
class MenusRepository {
    async findAll(isActive) {
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
        const params = [];
        if (isActive !== undefined) {
            sql += ` WHERE is_active = $1`;
            params.push(isActive);
        }
        sql += `
      ORDER BY
        sort_order ASC,
        menu_id ASC
    `;
        const result = await (0, db_1.query)(sql, params);
        return result;
    }
    async findById(menuId) {
        const result = await (0, db_1.query)(`
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
      `, [menuId]);
        return result[0] || null;
    }
    async findByKey(menuKey) {
        const result = await (0, db_1.query)(`
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
      `, [menuKey]);
        return result[0] || null;
    }
    async hasActiveChildren(menuId) {
        const result = await (0, db_1.query)(`
      SELECT COUNT(*)::text AS count
      FROM mst_menus
      WHERE parent_id = $1
        AND is_active = TRUE
      `, [menuId]);
        return Number(result[0].count) > 0;
    }
    async create(input) {
        try {
            const result = await (0, db_1.query)(`
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
        `, [
                input.menuName.trim(),
                input.menuKey.trim(),
                input.icon ?? null,
                input.parentId ?? null,
                input.sortOrder,
                input.createdBy
            ]);
            return result[0];
        }
        catch (error) {
            if (error.code === "23505") {
                throw new Error("A menu with this menu key already exists.");
            }
            throw error;
        }
    }
    async update(menuId, input) {
        const result = await (0, db_1.query)(`
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
      `, [
            input.menuName ?? null,
            input.menuKey ?? null,
            input.icon !== undefined,
            input.icon ?? null,
            input.parentId !== undefined,
            input.parentId ?? null,
            input.sortOrder ?? null,
            input.updatedBy,
            menuId
        ]);
        if (!result[0]) {
            throw new Error("Menu not found.");
        }
        return result[0];
    }
    async updateStatus(menuId, isActive, updatedBy) {
        const result = await (0, db_1.query)(`
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
      `, [
            isActive,
            updatedBy,
            menuId
        ]);
        if (!result[0]) {
            throw new Error("Menu not found.");
        }
        return result[0];
    }
}
exports.MenusRepository = MenusRepository;
//# sourceMappingURL=menus.repository.js.map