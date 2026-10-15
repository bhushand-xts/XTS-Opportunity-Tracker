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

export interface ExtractionConfig {
  enabled: boolean;
  storageRoot: string;
  serviceSecret: string;
  // When on, Groq extracts questions guided by the user's instructions. When off
  // (or unconfigured), local rule-based matching is used and needs no Groq key.
  aiExtraction: boolean;
  apiKey: string;
  model: string;
  zdrConfirmed: boolean;
  quotaScope: string;
  tokensPerMinute: number;
  tokensPerDay: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  requestTokens: number;
  retentionDays: number;
  maxBytes: number;
  maxPages: number;
  maxTextChars: number;
  parserQueue: boolean;
  parserTimeoutMs: number;
  libreOffice: string;
  ocrCommand: string;
  // Never inherit DB credentials or the Groq key into the isolated parser process.
  childEnv: NodeJS.ProcessEnv;
}

export interface Env {
  port: number;
  db: DbConfig;
  userServiceUrl: string;
  extraction: ExtractionConfig;
}

const aiExtraction = process.env.GROQ_AI_EXTRACTION === 'true';

const env: Env = {
  port: Number(process.env.PORT || 4003),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4001/graphql',
  extraction: {
    enabled: process.env.QUESTION_EXTRACTION_ENABLED === 'true',
    storageRoot: process.env.DOCUMENT_STORAGE_ROOT || '',
    serviceSecret: process.env.EXTRACTION_SERVICE_SECRET || '',
    aiExtraction,
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || (aiExtraction ? 'openai/gpt-oss-20b' : 'local-rules-v1'),
    zdrConfirmed: process.env.GROQ_ZDR_CONFIRMED === 'true',
    quotaScope: process.env.GROQ_QUOTA_SCOPE || 'question-extraction-groq',
    tokensPerMinute: Number(process.env.GROQ_TOKENS_PER_MINUTE || 8000),
    tokensPerDay: Number(process.env.GROQ_TOKENS_PER_DAY || 200000),
    requestsPerMinute: Number(process.env.GROQ_REQUESTS_PER_MINUTE || 30),
    requestsPerDay: Number(process.env.GROQ_REQUESTS_PER_DAY || 1000),
    requestTokens: Number(process.env.GROQ_REQUEST_TOKENS || 6200),
    retentionDays: Number(process.env.DOCUMENT_UNATTACHED_RETENTION_DAYS || 7),
    maxBytes: Number(process.env.DOCUMENT_MAX_BYTES || 25 * 1024 * 1024),
    maxPages: Number(process.env.DOCUMENT_MAX_PAGES || 200),
    maxTextChars: Number(process.env.DOCUMENT_MAX_TEXT_CHARS || 2_000_000),
    parserQueue: process.env.EXTRACTION_PARSER_QUEUE === 'true',
    parserTimeoutMs: Number(process.env.EXTRACTION_PARSER_TIMEOUT_MS || 60000),
    libreOffice: process.env.LIBREOFFICE_COMMAND || 'soffice',
    ocrCommand: process.env.OCRMYPDF_COMMAND || 'ocrmypdf',
    childEnv: { PATH: process.env.PATH },
  },
};

export default env;
