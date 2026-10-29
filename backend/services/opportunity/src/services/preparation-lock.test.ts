import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as service from './opportunity.service';
import type { Opportunity, RfpIntakeOpportunityUpdateInput } from '../repositories/opportunity.repository';
const repository = require('../repositories/opportunity.repository');
const scopes = require('../repositories/scope.repository');
const db = require('../config/db');
const users = require('../integrations/userService');
const admin = require('../integrations/adminService');

test('post-approval and closed opportunities keep Q&A readable and block direct answer, extraction and assessment edits', async t => {
  let current = { opportunityId: 10, stageId: 5, subStageId: 10, createdBy: 7, ownerId: 7 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 99, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({
    role: { id: 99, roleName: 'Sales Head', roleCode: 'SH', isActive: true },
    menus: [
      { menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', parentId: null, isActive: true },
      { menuId: 2, menuKey: 'pipeline', menuName: 'Pipeline', routePath: '/opportunity', parentId: 1, isActive: true },
    ],
    roleAccess: [{ menuId: 1, permissionKey: 'view' }, { menuId: 1, permissionKey: 'edit' }, { menuId: 2, permissionKey: 'view' }],
  }));
  t.mock.method(repository, 'findById', async () => current);
  const response = { id: 21, title: 'Delivery?', answer: 'Approved answer.', revision: 2 };
  t.mock.method(repository, 'findResponses', async () => [response]);
  const saveAnswer = t.mock.method(repository, 'saveAnswer', async () => {});
  const saveScope = t.mock.method(scopes, 'saveScope', async () => {});
  for (const [stageId, subStageId] of [[5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, 19], [10, 20]]) {
    current = { ...current, stageId, subStageId };
    const ctx = () => ({ user: { id: 7 } });
    assert.deepEqual(await service.getResponses(10, ctx()), [{ ...response, allowedActions: [] }]);
    await assert.rejects(service.saveAnswer(10, 21, 2, 'New answer', ctx()), /read-only/);
    await assert.rejects(service.assertExtractionEdit(10, 7, ctx()), /read-only/);
    for (const section of ['SCOPE', 'RISKS', 'ALIGNMENT'] as const) {
      await assert.rejects(service.saveScope(10, { revision: 0, summary: 'Change', risks: [], alignment: [] }, section, ctx()), /read-only/);
    }
    assert.equal((await service.allowedActions(current as Opportunity, ctx())).includes('EDIT_SCOPE'), false);
  }
  assert.equal(saveAnswer.mock.calls.length + saveScope.mock.calls.length, 0);
  for (const [stageId, subStageId] of [[1, 1], [1, 2], [2, 4], [2, 5], [3, 7], [4, 8], [4, 9], [9, 15], [9, 16], [9, 17]]) {
    current = { ...current, stageId, subStageId };
    const ctx = () => ({ user: { id: 7 } });
    assert.deepEqual(await service.getResponses(10, ctx()), [{ ...response, allowedActions: ['SAVE_ANSWER'] }]);
    await service.saveAnswer(10, 21, 2, 'Updated before CEO approval', ctx());
    await service.assertExtractionEdit(10, 7, ctx());
    for (const section of ['SCOPE', 'RISKS', 'ALIGNMENT'] as const) {
      await service.saveScope(10, { revision: 0, summary: 'Change', risks: [], alignment: [] }, section, ctx());
    }
    assert.equal((await service.allowedActions(current as Opportunity, ctx())).includes('EDIT_SCOPE'), true);
  }
  assert.equal(saveAnswer.mock.calls.length, 10);
  assert.equal(saveScope.mock.calls.length, 30);
});

test('an answer save racing CEO approval rechecks the locked parent before reading or archiving an answer', async t => {
  for (const [stageId, subStageId] of [[5, 10], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, 19]]) {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => { calls.push(sql); return { rows: [{ stageId, subStageId }] }; },
      release: () => {},
    }));
    await assert.rejects(repository.saveAnswer(10, 21, 0, 'Stale answer edit', 7), /read-only/);
    assert.match(calls[1], /stage_id AS "stageId", sub_stage_id AS "subStageId"[\s\S]*FOR UPDATE/);
    assert.equal(calls.some(sql => sql.includes('questions_answers')), false);
    assert.equal(calls.at(-1), 'ROLLBACK');
  }
});

const question = { questionId: 21, question: 'Describe delivery.', category: 'Technical', questionnaireTypeId: 1 };
const intake: RfpIntakeOpportunityUpdateInput = {
  opportunityName: 'Other details updated', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 1,
  client: { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' },
  contacts: [], questions: [question.question], questionSelections: [question],
};

test('both opportunity edit routes preserve unchanged approved questions and reject actual question or RFP type changes before writes', async t => {
  for (const intakePath of [false, true]) {
    for (const [stageId, subStageId] of [[5, 10], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, 19]]) {
      const current = { opportunityId: 10, clientId: 1, stageId, subStageId, opportunityTypeId: 1, createdBy: 7, assignedTo: null };
      const calls: string[] = [];
      t.mock.method(db.pool, 'connect', async () => ({
        query: async (sql: string) => {
          calls.push(sql.trim());
          if (sql.startsWith('SELECT question_id AS "questionId"')) return { rows: [question] };
          return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [current] : [] };
        }, release: () => {},
      }));
      const save = (selections = [question], rfpType = 1) => intakePath
        ? repository.updateRfpIntakeOpportunity(10, { ...intake, questionSelections: selections, rfpType }, 7)
        : repository.update(10, { opportunityName: 'Other details updated', proposalQuestionSelections: selections, rfpType }, 7);
      await save();
      assert.ok(calls.some(sql => sql.startsWith('UPDATE tbl_opportunity')));
      assert.equal(calls.some(sql => /^(UPDATE|DELETE FROM|INSERT INTO) tbl_opportunity_questions_answers/.test(sql)), false);
      assert.equal(calls.at(-1), 'COMMIT');
      for (const selection of [
        [], [question, { ...question, questionId: 22 }], [{ ...question, question: 'Different text' }],
        [{ ...question, category: 'Financial' }], [{ ...question, questionnaireTypeId: 2 }],
      ]) {
        calls.length = 0;
        await assert.rejects(save(selection), /read-only/);
        assert.equal(calls.some(sql => /^(UPDATE|DELETE FROM|INSERT INTO)/.test(sql)), false);
        assert.equal(calls.at(-1), 'ROLLBACK');
      }
      calls.length = 0;
      await assert.rejects(save([question], 2), /read-only/);
      assert.equal(calls.some(sql => /^(UPDATE|DELETE FROM|INSERT INTO)/.test(sql)), false);
      assert.equal(calls.at(-1), 'ROLLBACK');
    }
  }
});

test('an approved opportunity edit that omits RFP type retains the persisted frozen type', async t => {
  const current = { opportunityId: 10, stageId: 5, subStageId: 10, opportunityTypeId: 1, createdBy: 7, assignedTo: null };
  let writtenType: unknown;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      if (sql.startsWith('UPDATE tbl_opportunity\n')) writtenType = params[1];
      return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [current] : [] };
    }, release: () => {},
  }));
  await repository.update(10, { opportunityName: 'Updated metadata' }, 7);
  assert.equal(writtenType, 1);
});
