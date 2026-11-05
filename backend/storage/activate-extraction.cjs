const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../node_modules/dotenv');
const { Client } = require('../node_modules/pg');
const root = path.resolve(__dirname, '../..');
const serviceFile = path.join(root, 'backend/services/opportunity/.env');
const values = dotenv.parse(fs.readFileSync(serviceFile));
const client = new Client({ host: values.DB_HOST, port: Number(values.DB_PORT || 5432), user: values.DB_USER,
  password: values.DB_PASSWORD, database: values.DB_NAME, connectionTimeoutMillis: 10000 });
function setValues(file, changes) {
  let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const [name, value] of Object.entries(changes)) {
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    if (pattern.test(content)) content = content.replace(pattern, `${name}=${value}`);
    else content += `${content.endsWith('\n') || !content ? '' : '\n'}${name}=${value}\n`;
  }
  fs.writeFileSync(file, content);
}
async function main() {
  if (!values.GROQ_API_KEY || values.GROQ_ZDR_CONFIRMED !== 'true') throw new Error('KEY_OR_ZDR_MISSING');
  const models = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${values.GROQ_API_KEY}` }, signal: AbortSignal.timeout(15000),
  });
  if (!models.ok) throw new Error(`GROQ_AUTH_HTTP_${models.status}`);
  const available = await models.json();
  if (!available.data.some(m => m.id === (values.GROQ_MODEL || 'openai/gpt-oss-20b'))) throw new Error('GROQ_MODEL_UNAVAILABLE');
  console.log('Groq key accepted; configured model available.');
  await client.connect();
  const initial = await client.query("SELECT to_regclass('question_documents') IS NOT NULL AS installed");
  console.log('Opportunity database reachable. Extraction schema installed:', initial.rows[0].installed);
  await client.query(fs.readFileSync(path.join(root, 'backend/database/migrations/20261014_question_extraction.sql'), 'utf8'));
  console.log('Additive extraction migration applied.');
  const gatewayFile = path.join(root, 'backend/gateway/.env');
  const gatewayValues = fs.existsSync(gatewayFile) ? dotenv.parse(fs.readFileSync(gatewayFile)) : {};
  const secret = values.EXTRACTION_SERVICE_SECRET?.length >= 32 ? values.EXTRACTION_SERVICE_SECRET : gatewayValues.EXTRACTION_SERVICE_SECRET?.length >= 32 ? gatewayValues.EXTRACTION_SERVICE_SECRET : crypto.randomBytes(32).toString('hex');
  const storage = path.join(root, 'backend/storage/opportunity-documents');
  fs.mkdirSync(storage, { recursive: true });
  setValues(serviceFile, { QUESTION_EXTRACTION_ENABLED: 'true', DOCUMENT_STORAGE_ROOT: storage.replace(/\\/g, '/'), EXTRACTION_SERVICE_SECRET: secret });
  setValues(gatewayFile, { QUESTION_EXTRACTION_ENABLED: 'true', EXTRACTION_SERVICE_SECRET: secret });
  setValues(path.join(root, 'frontend/.env'), { QUESTION_EXTRACTION_ENABLED: 'true', OPPORTUNITY_USE_LOCAL_WORKFLOW: 'false' });
  console.log('Extraction enabled in local service/gateway/frontend configuration. Secrets were not printed.');
}
main().catch(error => { console.error('Activation did not complete:', /^[A-Z_0-9]+$/.test(error.message || '') ? error.message : (error.code || 'CONNECTIVITY_OR_CONFIGURATION_ERROR')); process.exitCode = 1; }).finally(() => client.end().catch(() => {}));
