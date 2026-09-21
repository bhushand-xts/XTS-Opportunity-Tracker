"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findByEmail = findByEmail;
exports.createUser = createUser;
exports.createSession = createSession;
exports.countByRole = countByRole;
const db_1 = require("../config/db");
async function findAll() {
    return [];
}
async function findByEmail(email) {
    const rows = await (0, db_1.query)('SELECT user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash" FROM mst_user WHERE LOWER(email) = LOWER($1) AND is_active = TRUE', [email]);
    return rows[0] ?? null;
}
async function createUser(firstName, lastName, email, passwordHash) {
    const rows = await (0, db_1.query)('INSERT INTO mst_user (first_name, last_name, email, password_hash) VALUES ($1, $2, LOWER($3), $4) RETURNING user_id AS id, first_name AS "firstName", last_name AS "lastName", email, password_hash AS "passwordHash"', [firstName, lastName, email, passwordHash]);
    return rows[0];
}
async function createSession(userId, tokenHash, expiresAt) {
    await (0, db_1.query)('INSERT INTO auth_session (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
}
async function countByRole(roleId) {
    const rows = await (0, db_1.query)('SELECT COUNT(*) AS count FROM mst_user WHERE role_id = $1', [roleId]);
    return Number(rows[0]?.count ?? 0);
}
//# sourceMappingURL=user.repository.js.map