import { Pool, PoolClient } from 'pg';
import env from './env';

// ONE pool per service. Never create another one.
const pool = new Pool(env.db);

pool.on('error', (err) => console.error('pg pool error', err));

// Always pass values as parameters. Never build SQL with string concat.
async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

// Use for any write that also touches a _tracker table.
async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool, query, transaction };
