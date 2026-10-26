import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { holdReasonCode, roleAccess } from './adminService';

test('role audit metadata is loaded from the role master using the verified role ID', async t => {
  const request = t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.variables.roleId, 15);
    assert.match(body.query, /role\(id: \$roleId\)/);
    assert.match(body.query, /roleCode isActive/);
    return new Response(JSON.stringify({ data: { menus: [], roleAccess: [], role: { id: 15, roleName: 'Sales Head', roleCode: 'SH', isActive: true } } }));
  });
  assert.deepEqual((await roleAccess(15)).role, { id: 15, roleName: 'Sales Head', roleCode: 'SH', isActive: true });
  assert.equal(request.mock.calls.length, 1);
});

test('hold reason validation uses the master ID and preserves active status', async t => {
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.variables, { id: 3 });
    return new Response(JSON.stringify({ data: { reasonCode: { id: 3, reasonName: 'Missing information', description: 'Details missing.', isActive: false } } }));
  });
  assert.equal((await holdReasonCode(3))?.isActive, false);
});

test('reason master errors fail the lookup instead of authorizing a partial response', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    data: { reasonCode: { id: 3, isActive: true } }, errors: [{ message: 'Reason lookup denied' }],
  })));
  await assert.rejects(holdReasonCode(3), /Unable to verify/);
});
