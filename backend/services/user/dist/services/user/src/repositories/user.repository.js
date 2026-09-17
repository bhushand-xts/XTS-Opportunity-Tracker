"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.countByRole = countByRole;
const db_1 = require("../config/db");
async function findAll() {
    return [];
}
async function countByRole(roleId) {
    const rows = await (0, db_1.query)('SELECT COUNT(*) AS count FROM mst_user WHERE role_id = $1', [roleId]);
    return Number(rows[0]?.count ?? 0);
}
//# sourceMappingURL=user.repository.js.map