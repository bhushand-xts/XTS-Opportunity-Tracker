import path from 'node:path';
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
  adminServiceUrl: string;
}

// Extraction works on a fresh checkout without extra .env entries: values set in .env always win;
// missing ones fall back to the working local setup. Production must set the secret explicitly.
const flag = (name: string, fallback: boolean) => process.env[name] === undefined || process.env[name] === '' ? fallback : process.env[name] === 'true';
const groqKey = process.env.GROQ_API_KEY || '';
const zdrConfirmed = flag('GROQ_ZDR_CONFIRMED', false);
// AI is on by default once a key and the zero-data-retention confirmation are present; otherwise local rules are used.
const aiExtraction = flag('GROQ_AI_EXTRACTION', !!groqKey && zdrConfirmed);
const LOCAL_EXTRACTION_SECRET = 'xts-local-development-extraction-secret-v1';

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
    enabled: flag('QUESTION_EXTRACTION_ENABLED', true),
    // npm scripts run from services/opportunity, so this is backend/storage/opportunity-documents.
    storageRoot: process.env.DOCUMENT_STORAGE_ROOT || path.resolve(process.cwd(), '../../storage/opportunity-documents'),
    serviceSecret: process.env.EXTRACTION_SERVICE_SECRET || (process.env.NODE_ENV === 'production' ? '' : LOCAL_EXTRACTION_SECRET),
    aiExtraction,
    apiKey: groqKey,
    model: process.env.GROQ_MODEL || (aiExtraction ? 'openai/gpt-oss-120b' : 'local-rules-v1'),
    zdrConfirmed,
    quotaScope: process.env.GROQ_QUOTA_SCOPE || 'question-extraction-groq-120b',
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
  adminServiceUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:4010/graphql',
};

export default env;
