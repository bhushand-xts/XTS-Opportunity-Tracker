"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findById = findById;
exports.findByName = findByName;
exports.findByCode = findByCode;
exports.create = create;
exports.update = update;
exports.remove = remove;
const db_1 = require("../config/db");
const SELECT_COLUMNS = `
  role_id AS id,
  role_name AS "roleName",
  role_code AS "roleCode",
  description,
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;
async function findAll() {
    const rows = await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles ORDER BY role_name`);
    return rows;
}
async function findById(id) {
    const rows = await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE role_id = $1`, [id]);
    return rows[0] || null;
}
async function findByName(roleName, excludeId) {
    const rows = excludeId
        ? await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_name) = LOWER($1) AND role_id <> $2`, [roleName, excludeId])
        : await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_name) = LOWER($1)`, [roleName]);
    return rows[0] || null;
}
async function findByCode(roleCode, excludeId) {
    const rows = excludeId
        ? await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_code) = LOWER($1) AND role_id <> $2`, [roleCode, excludeId])
        : await (0, db_1.query)(`SELECT ${SELECT_COLUMNS} FROM mst_roles WHERE LOWER(role_code) = LOWER($1)`, [roleCode]);
    return rows[0] || null;
}
async function create(input, userId) {
    const rows = await (0, db_1.query)(`INSERT INTO mst_roles (role_name, role_code, description, is_active, created_by)
     VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
     RETURNING ${SELECT_COLUMNS}`, [input.roleName, input.roleCode ?? null, input.description ?? null, input.isActive ?? null, userId]);
    return rows[0];
}
async function update(id, input, userId) {
    const rows = await (0, db_1.query)(`UPDATE mst_roles SET
       role_name = COALESCE($1, role_name),
       role_code = CASE WHEN $2::boolean THEN $3 ELSE role_code END,
       description = CASE WHEN $4::boolean THEN $5 ELSE description END,
       is_active = COALESCE($6, is_active),
       updated_dt = CURRENT_TIMESTAMP,
       updated_by = $7
     WHERE role_id = $8
     RETURNING ${SELECT_COLUMNS}`, [
        input.roleName ?? null,
        'roleCode' in input,
        input.roleCode ?? null,
        'description' in input,
        input.description ?? null,
        input.isActive ?? null,
        userId,
        id,
    ]);
    return rows[0];
}
async function remove(id) {
    await (0, db_1.query)('DELETE FROM mst_roles WHERE role_id = $1', [id]);
}
//# sourceMappingURL=roles.repository.js.map