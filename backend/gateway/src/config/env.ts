function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

export interface Env {
  port: number;
  corsOrigin: string[];
  extractionEnabled: boolean;
  extractionSecret: string;
  extractionUrl: string;
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
  extractionEnabled: process.env.QUESTION_EXTRACTION_ENABLED === 'true',
  extractionSecret: process.env.EXTRACTION_SERVICE_SECRET || '',
  // The extraction REST routes live on the opportunity service's HTTP server,
  // alongside its GraphQL endpoint.
  extractionUrl: (process.env.OPPORTUNITY_URL || 'http://localhost:4003/graphql').replace(/\/graphql\/?$/, ''),
};

export default env;
