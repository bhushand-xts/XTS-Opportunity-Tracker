function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

export interface Env {
  port: number;
  corsOrigin: string[];
}

// CORS_ORIGIN is a comma-separated list. The default allows the app shell
// (webpack, port 3000) and the standalone admin MFE (port 3001).
const DEFAULT_CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

const env: Env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export default env;
