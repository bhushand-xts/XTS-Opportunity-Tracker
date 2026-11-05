import assert from 'node:assert/strict';
import { test } from 'node:test';
// No real database configuration or connection is used by these query-boundary tests.
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '1', DB_NAME: 'unit_test', DB_USER: 'unit_test', DB_PASSWORD: 'unit_test' });
const repository = require('./reason-codes.repository');
const db = require('../config/db');

test('master reason queries bind the negotiation flag and preserve legacy unfiltered reads', async t => {
  const query = t.mock.method(db, 'query', async () => []);
  for (const flag of [true, false]) {
    await repository.findAll(flag);
    const args = query.mock.calls.at(-1)!.arguments as unknown[];
    assert.match(String(args[0]), /WHERE COALESCE\(is_negotiation_reason, FALSE\) = \$1/);
    assert.deepEqual(args[1], [flag]);
  }
  await repository.findAll();
  const args = query.mock.calls.at(-1)!.arguments as unknown[];
  assert.doesNotMatch(String(args[0]), /WHERE/);
  assert.deepEqual(args[1], []);
});
