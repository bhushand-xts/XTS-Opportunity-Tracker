"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
const pg_1 = require("pg");
const env_1 = __importDefault(require("./env"));
// ONE pool per service. Never create another one.
const pool = new pg_1.Pool(env_1.default.db);
exports.pool = pool;
pool.on('error', (err) => console.error('pg pool error', err));
// Always pass values as parameters. Never build SQL with string concat.
async function query(text, params) {
    const result = await pool.query(text, params);
    return result.rows;
}
// Use for any write that also touches a _tracker table.
async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=db.js.map