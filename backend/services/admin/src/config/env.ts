// Reads env vars ONCE. Never call process.env anywhere else.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
}

export interface Env {
  port: number;
  db: DbConfig;
  userServiceUrl: string;
}

const env: Env = {
  port: Number(process.env.PORT || 4010),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
  // admin has no DB-level FK into user's mst_user (separate database) —
  // role-in-use checks go through user's GraphQL API instead.
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4001/graphql',
};

export default env;
