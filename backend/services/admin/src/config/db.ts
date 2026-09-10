import { Pool, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";

export const pool = new Pool({
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,

    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

export async function query<T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
}