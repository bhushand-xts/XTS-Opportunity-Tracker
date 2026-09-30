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

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  // Off only when the network's TLS is intercepted by a corporate proxy that
  // re-signs certs with an internal CA Node doesn't trust (SMTP_REJECT_UNAUTHORIZED=false).
  // Keep true anywhere that isn't the case.
  rejectUnauthorized: boolean;
}

export interface Env {
  port: number;
  db: DbConfig;
  adminServiceUrl: string;
  frontendUrl: string;
  smtp: SmtpConfig;
}

const env: Env = {
  port: Number(process.env.PORT || 4001),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
  adminServiceUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:4010/graphql',
  // Where a password-reset link points — the app-shell's own origin.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  smtp: {
    host: required('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT || 587),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
    from: process.env.SMTP_FROM || required('SMTP_USER'),
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
  },
};

export default env;
