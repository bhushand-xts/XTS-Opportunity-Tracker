"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsRepository = void 0;
const db_1 = require("../config/db");
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
class PermissionsRepository {
    // --------------------------------------------------
    // PERMISSION MANAGEMENT
    // --------------------------------------------------
    async findAll() {
        const result = await (0, db_1.query)(`
        SELECT
          ${permissionFields}
        FROM mst_permissions
        ORDER BY
          permission_name ASC,
          permission_id ASC
        `);
        return result;
    }
    async findById(permissionId) {
        const result = await (0, db_1.query)(`
        SELECT
          ${permissionFields}
        FROM mst_permissions
        WHERE permission_id = $1
        `, [permissionId]);
        return result[0] || null;
    }
    async findByKey(permissionKey) {
        const result = await (0, db_1.query)(`
        SELECT
          ${permissionFields}
        FROM mst_permissions
        WHERE permission_key = $1
        `, [permissionKey]);
        return result[0] || null;
    }
    async create(input) {
        try {
            const result = await (0, db_1.query)(`
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
          `, [
                input.permissionName.trim(),
                input.permissionKey.trim(),
                input.description ?? null,
                input.createdBy
            ]);
            return result[0];
        }
        catch (error) {
            if (error.code === "23505") {
                throw new Error("A permission with this permission key already exists.");
            }
            throw error;
        }
    }
    async update(permissionId, input) {
        const result = await (0, db_1.query)(`
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
        `, [
            input.permissionName ?? null,
            input.permissionKey ?? null,
            input.description !== undefined,
            input.description ?? null,
            input.updatedBy,
            permissionId
        ]);
        if (!result[0]) {
            throw new Error("Permission not found.");
        }
        return result[0];
    }
    async updateStatus(permissionId, isActive, updatedBy) {
        const result = await (0, db_1.query)(`
        UPDATE mst_permissions
        SET
          is_active = $1,
          updated_dt = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE permission_id = $3
        RETURNING
          ${permissionFields}
        `, [
            isActive,
            updatedBy,
            permissionId
        ]);
        if (!result[0]) {
            throw new Error("Permission not found.");
        }
        return result[0];
    }
    // --------------------------------------------------
    // MENU-PERMISSION MAPPING
    // --------------------------------------------------
    async getMenuListForMapping() {
        const result = await (0, db_1.query)(`
        SELECT
          menu_id AS "menuId",
          menu_name AS "menuName"
        FROM mst_menus
        WHERE is_active = TRUE
        ORDER BY
          sort_order ASC,
          menu_name ASC
        `);
        return result;
    }
    async getMenuPermissions(menuId) {
        const result = await (0, db_1.query)(`
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
        `, [menuId]);
        return result;
    }
    async getMenuPermissionMappings() {
        const result = await (0, db_1.query)(`
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
        `);
        return result;
    }
    async menuExists(menuId) {
        const result = await (0, db_1.query)(`
        SELECT 1
        FROM mst_menus
        WHERE menu_id = $1
          AND is_active = TRUE
        `, [menuId]);
        return result.length > 0;
    }
    async permissionExists(permissionId) {
        const result = await (0, db_1.query)(`
        SELECT 1
        FROM mst_permissions
        WHERE permission_id = $1
          AND is_active = TRUE
        `, [permissionId]);
        return result.length > 0;
    }
    async saveMenuPermissions(menuId, permissionIds, updatedBy) {
        /*
          First remove the existing mapping
          for this menu.
    
          Then insert the currently selected
          permissions.
        */
        await (0, db_1.query)(`
      DELETE FROM tbl_menu_permission
      WHERE menu_id = $1
      `, [menuId]);
        for (const permissionId of permissionIds) {
            await (0, db_1.query)(`
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
        `, [
                menuId,
                permissionId,
                updatedBy
            ]);
        }
    }
}
exports.PermissionsRepository = PermissionsRepository;
//# sourceMappingURL=permissions.repository.js.map