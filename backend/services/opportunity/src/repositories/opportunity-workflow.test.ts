import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { create, createClient, finalizeRfpIntakeOpportunity, findResponses, findStageHistory, saveAnswer, saveEstimation, transitionWorkflow, update, updateClient, updateRfpIntakeOpportunity } from './opportunity.repository';
const db = require('../config/db');

test('Q&A loads active opportunity-specific questions with their stored answers and independent versions', async t => {
  const rows = [{ id: 21, title: 'Delivery?', answer: 'Discovery first.', revision: 3 }];
  const read = t.mock.method(db, 'query', async () => rows);
  assert.deepEqual(await findResponses(10), rows);
  const [sql, params] = read.mock.calls[0].arguments as [string, unknown[]];
  assert.match(sql, /q\.opportunity_id = \$1 AND q\.is_active = TRUE/);
  assert.match(sql, /q\.qa_id AS id/);
  assert.match(sql, /COALESCE\(q\.answertext, ''\) AS answer/);
  assert.match(sql, /COUNT\(\*\)::INTEGER.*h\.qa_id = q\.qa_id/);
  assert.deepEqual(params, [10]);
});

test('saving a question answer records its author and history atomically without changing workflow or assignments', async t => {
  const calls: { sql: string; params: unknown[] }[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.includes('FROM tbl_opportunity_questions_answers q')) return { rows: [{ id: 21, answer: '', revision: 2 }] };
      return { rows: sql.startsWith('SELECT') ? [{ opportunity_id: 10 }] : [] };
    }, release: () => {},
  }));
  await saveAnswer(10, 21, 2, 'Delivery plan.\nSecond phase.', 7);
  const read = calls.find(call => call.sql.includes('FROM tbl_opportunity_questions_answers q'))!;
  assert.deepEqual(read.params, [10, 21]);
  assert.match(read.sql, /q\.opportunity_id = \$1 AND q\.qa_id = \$2 AND q\.is_active = TRUE FOR UPDATE/);
  const write = calls.find(call => call.sql.startsWith('UPDATE tbl_opportunity_questions_answers\n'))!;
  assert.deepEqual(write.params, [10, 21, 'Delivery plan.\nSecond phase.', 7]);
  assert.match(write.sql, /answered_by = \$4, answered_dt = CURRENT_TIMESTAMP/);
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker')));
  assert.ok(calls.findIndex(call => call.sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker')) < calls.indexOf(write));
  assert.equal(calls.some(call => /SET stage_id|assigned_to|engage_tracker/.test(call.sql)), false);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('answer updates retain previous text and authors, including questions without existing history', async t => {
  for (const existingHistory of [true, false]) {
    const current = { id: 21, opportunityId: 10, answer: 'Original answer.', answeredBy: 3 };
    const history = existingHistory ? [{ ...current, isCurrent: true }] : [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM tbl_opportunity_questions_answers q')) {
          assert.deepEqual(params, [10, 21]);
          return { rows: [{ ...current, revision: history.length }] };
        }
        if (sql.includes('UPDATE tbl_opportunity_questions_answers_tracker')) {
          history.forEach(snapshot => { snapshot.isCurrent = false; });
        } else if (sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker')) {
          history.push({ ...current, isCurrent: false });
        } else if (sql.startsWith('UPDATE tbl_opportunity_questions_answers\n')) {
          assert.deepEqual(params.slice(0, 2), [10, 21]);
          current.answer = params[2] as string;
          current.answeredBy = params[3] as number;
        }
        return { rows: sql.startsWith('SELECT') ? [{ opportunity_id: 10 }] : [] };
      }, release: () => {},
    }));
    await saveAnswer(10, 21, history.length, 'First update.', 7);
    await saveAnswer(10, 21, history.length, 'Second update.', 8);
    assert.deepEqual(current, { id: 21, opportunityId: 10, answer: 'Second update.', answeredBy: 8 });
    assert.deepEqual(history.slice(existingHistory ? 1 : 0).map(snapshot => [snapshot.answer, snapshot.answeredBy, snapshot.isCurrent]), [
      ['Original answer.', 3, false], ['First update.', 7, false],
    ]);
    const count = history.length;
    await saveAnswer(10, 21, count, 'Second update.', 8);
    assert.equal(history.length, count, 'An unchanged answer does not create duplicate history.');
  }
});

test('stale, removed or cross-opportunity question answers roll back before any write', async t => {
  for (const current of [null, { id: 21, answer: 'Another answer', revision: 3 }]) {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        return { rows: sql.includes('FROM tbl_opportunity_questions_answers q') ? current ? [current] : [] : [{ opportunity_id: 10 }] };
      }, release: () => {},
    }));
    await assert.rejects(saveAnswer(10, 21, 2, 'My answer', 7), current ? /has changed/ : /no longer available/);
    assert.equal(calls.some(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT')), false);
    assert.equal(calls.at(-1), 'ROLLBACK');
  }
});

test('answer audit failures roll back the answer instead of leaving unaudited text', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker')) throw new Error('Audit unavailable');
      return { rows: sql.includes('FROM tbl_opportunity_questions_answers q') ? [{ id: 21, answer: '', revision: 2 }] : [{ opportunity_id: 10 }] };
    }, release: () => {},
  }));
  await assert.rejects(saveAnswer(10, 21, 2, 'New answer', 7), /Audit unavailable/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
});

test('creation saves each questionnaire mode only in the current table with no opportunity or question snapshot', async t => {
  for (const questionnaireTypeId of [1, 2]) {
    const calls: { sql: string; params: unknown[] }[] = [];
    const opportunity = { opportunityId: 10, stageId: 1, subStageId: 1 };
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params });
        if (sql.includes('FROM tbl_opportunity_questions_answers') && !sql.includes('ARRAY_AGG')) return { rows: [] };
        if (sql.includes('INSERT INTO tbl_opportunity_questions_answers\n')) return { rows: [{ qaId: 21 }] };
        return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [opportunity] : [] };
      }, release: () => {},
    }));
    await create({ rfpType: 1, proposalQuestionSelections: [{ questionId: null, question: 'Describe delivery.', category: 'Technical', questionnaireTypeId }] }, 7);
    const question = calls.find(call => call.sql.includes('INSERT INTO tbl_opportunity_questions_answers\n'))!;
    assert.deepEqual(question.params, [10, 1, null, 'Describe delivery.', 'Technical', 7, questionnaireTypeId]);
    assert.match(question.sql, /questionnaire_type_id/);
    assert.equal(calls.some(call => /INSERT INTO \w+_tracker/.test(call.sql)), false);
    assert.ok(calls.some(call => call.sql.includes('ARRAY_AGG(questionnaire_type_id ORDER BY qa_id)')));
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  }
});

test('a mode-only update snapshots the previous value before updating, and an unchanged or omitted mode preserves the saved choice', async t => {
  for (const scenario of [
    { stored: 1, selected: 2, rfpType: 1, expected: 2, changed: true },
    { stored: 2, selected: 1, rfpType: 1, expected: 1, changed: true },
    { stored: 2, selected: 2, rfpType: 1, expected: 2, changed: false },
    { stored: 2, selected: undefined, rfpType: 1, expected: 2, changed: false },
    { stored: 2, selected: 2, rfpType: 2, expected: null, changed: true },
  ]) {
    const calls: { sql: string; params: unknown[] }[] = [];
    const opportunity = { opportunityId: 10, stageId: 1, subStageId: 1, createdBy: 7 };
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params });
        if (sql.includes('FROM tbl_opportunity_questions_answers') && sql.includes('qa_id AS "qaId"')) return { rows: [{
          qaId: 21, questionId: null, question: 'Describe delivery.', category: 'Technical', opportunityTypeId: scenario.rfpType, questionnaireTypeId: scenario.stored,
        }] };
        return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [opportunity] : [] };
      }, release: () => {},
    }));
    await update(10, { stageId: 1, subStageId: 1, rfpType: scenario.rfpType, proposalQuestionSelections: [{
      questionId: null, question: 'Describe delivery.', category: 'Technical', questionnaireTypeId: scenario.selected,
    }] }, 7);
    const questionUpdates = calls.filter(call => call.sql.includes('UPDATE tbl_opportunity_questions_answers\n'));
    const snapshots = calls.filter(call => call.sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker'));
    assert.equal(questionUpdates.length, scenario.changed ? 1 : 0);
    assert.equal(snapshots.length, scenario.changed ? 1 : 0);
    if (scenario.changed) {
      assert.equal(questionUpdates[0].params[6], scenario.expected);
      assert.equal(snapshots[0].sql.match(/questionnaire_type_id/g)?.length, 2);
      assert.match(snapshots[0].sql, /updated_by, FALSE/);
      assert.ok(calls.indexOf(snapshots[0]) < calls.indexOf(questionUpdates[0]));
    }
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  }
});

test('stage history loads every recorded transition in timestamp and tracker order for only the requested opportunity', async t => {
  const rows = [{ id: 1, stageId: 1, subStageId: 1, reachedAt: new Date('2026-10-19T04:00:00Z'), comment: null }];
  const read = t.mock.method(db, 'query', async () => rows);
  assert.deepEqual(await findStageHistory(10), rows);
  const [sql, params] = read.mock.calls[0].arguments as [string, unknown[]];
  assert.match(sql, /FROM tbl_opportunity_engage_tracker/);
  assert.match(sql, /updated_dt AS "reachedAt"/);
  assert.match(sql, /updated_by AS "updatedBy"/);
  assert.match(sql, /WHERE opportunity_id = \$1/);
  assert.match(sql, /ORDER BY updated_dt ASC, tracker_id ASC/);
  assert.doesNotMatch(sql, /is_current\s*=/);
  assert.deepEqual(params, [10]);
});

test('a stale reviewed stage rolls back before any status or engagement writes', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => { calls.push(sql); return { rows: sql.startsWith('SELECT') ? [{ stageId: 2, subStageId: 4 }] : [] }; },
    release: () => {},
  }));
  await assert.rejects(transitionWorkflow(10, 9, 15, null, 7, 'Reject', null, {}, { stageId: 1, subStageId: 1 }), /changed while you were reviewing/);
  assert.ok(calls.some(sql => sql.includes('FOR UPDATE')));
  assert.equal(calls.some(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT')), false);
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('both update paths return requested changes to the correct review and preserve approved stages', async t => {
  for (const intake of [false, true]) {
    for (const [stageId, subStageId, expectedSubstage] of [[1, 2, 1], [2, 5, 4], [1, 1, 1], [1, 3, 3], [2, 4, 4], [3, 7, 7], [4, 8, 8], [5, 10, 10], [6, 12, 12], [7, 13, 13], [8, 14, 14], [9, 15, 15]]) {
      let current = { opportunityId: 10, stageId, subStageId, createdBy: stageId === 2 ? 99 : 7, assignedTo: 7 as number | null, clientId: 1 };
      const calls: { sql: string; params: unknown[] }[] = [];
      t.mock.method(db.pool, 'connect', async () => ({
        query: async (sql: string, params: unknown[] = []) => {
          calls.push({ sql, params });
          if (sql.includes('SET sub_stage_id = $2')) current = { ...current, subStageId: params[1] as number, assignedTo: null };
          return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') && sql.includes('opportunity_name = $1') ? [{ ...current }] : [] };
        },
        release: () => {},
      }));
      const audit = { roleId: 15, roleName: 'Sales Head' };
      const saved = intake ? await updateRfpIntakeOpportunity(10, {
        opportunityName: 'Corrected', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 2,
        client: { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' },
        contacts: [], questions: [],
      }, 7, audit) : await update(10, { stageId, subStageId, opportunityName: 'Corrected' }, 7, audit);
      assert.equal(saved?.stageId, stageId);
      assert.equal(saved?.subStageId, expectedSubstage);
      assert.ok(calls[1].sql.includes('FOR UPDATE'));
      const engage = calls.filter(call => call.sql.includes('INSERT INTO tbl_opportunity_engage_tracker'));
      assert.equal(engage.length, subStageId === expectedSubstage ? 0 : 1);
      if (engage.length) {
        assert.deepEqual(engage[0].params.slice(0, 4), [10, stageId, expectedSubstage, 7]);
        assert.deepEqual(engage[0].params.slice(-2), [15, 'Sales Head']);
      }
      assert.equal(calls.at(-1)?.sql, 'COMMIT');
    }
  }
});

test('an authorized non-creator update saves without resubmitting the creator corrections', async t => {
  const current = { opportunityId: 10, stageId: 1, subStageId: 2, createdBy: 99, assignedTo: 99, clientId: 1 };
  for (const intake of [false, true]) {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [current] : [] };
      },
      release: () => {},
    }));
    const saved = intake ? await updateRfpIntakeOpportunity(10, {
      opportunityName: 'Corrected', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 2,
      client: { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' },
      contacts: [], questions: [],
    }, 7, { roleName: 'Sales Head' }) : await update(10, { stageId: 1, subStageId: 2, opportunityName: 'Corrected' }, 7, { roleName: 'Sales Head' });
    assert.equal(saved?.subStageId, 2);
    assert.equal(calls.some(sql => sql.includes('SET sub_stage_id = $2')), false);
    assert.equal(calls.at(-1), 'COMMIT');
  }
});

test('a failed return-to-review audit rolls back the opportunity save', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('INSERT INTO tbl_opportunity_engage_tracker')) throw new Error('Audit unavailable');
      return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [{ opportunityId: 10, stageId: 1, subStageId: 2, createdBy: 7, assignedTo: 7 }] : [] };
    },
    release: () => {},
  }));
  await assert.rejects(update(10, { stageId: 1, subStageId: 2, opportunityName: 'Corrected' }, 7), /Audit unavailable/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
});

test('a save based on a stale review step cannot overwrite a newer approval', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => { calls.push(sql); return { rows: [{ stageId: 2, subStageId: 4, createdBy: 7, assignedTo: null }] }; },
    release: () => {},
  }));
  await assert.rejects(update(10, { stageId: 1, subStageId: 2, opportunityName: 'Old edit' }, 7), /changed while you were editing/);
  assert.equal(calls.some(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT')), false);
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('estimation saving checks the locked stage and revision and binds matrix data', async t => {
  let stage = 3, savedRevision = true;
  const calls: { sql: string; params: unknown[] }[] = [];
  const estimation = { revision: 2, rows: [{ id: 'row', workItem: "Engineering's estimate", hours: '2', people: 1, hourlyRate: '100' }], assumptions: 'One sprint', total: '200.00' };
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: sql.startsWith('SELECT') ? [{ stage_id: stage, sub_stage_id: stage === 3 ? 7 : 8 }] : sql.includes('RETURNING revision') && savedRevision ? [{ revision: 3 }] : [] };
    },
    release: () => {},
  }));
  await saveEstimation(10, estimation, 7);
  const insert = calls.find(call => call.sql.includes('INSERT INTO'))!;
  assert.deepEqual(insert.params, [10, JSON.stringify(estimation.rows), 'One sprint', '200.00', 7, 2]);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  savedRevision = false;
  await assert.rejects(saveEstimation(10, estimation, 7), /estimation changed/);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  stage = 4;
  const inserts = calls.filter(call => call.sql.includes('INSERT INTO')).length;
  await assert.rejects(saveEstimation(10, estimation, 7), /no longer in estimation/);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO')).length, inserts);
});

test('a decision and its engagement audit commit together with bound reason and role values', async t => {
  const calls: { sql: string; params: unknown[] }[] = [];
  let released = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: sql.includes('RETURNING opportunity_id') || sql.startsWith('SELECT') ? [{ opportunityId: 10 }] : [] };
    },
    release: () => { released = true; },
  }));
  const audit = { reasonCodeId: 4, roleId: 15, roleName: "Sales Head's role" };
  await transitionWorkflow(10, 1, 3, null, 7, 'Awaiting budget approval.', null, audit);
  const reset = calls.findIndex(call => call.sql.includes('UPDATE tbl_opportunity_engage_tracker'));
  const insert = calls.findIndex(call => call.sql.includes('INSERT INTO tbl_opportunity_engage_tracker'));
  assert.equal(calls[0].sql, 'BEGIN');
  assert.ok(reset > 0 && insert > reset);
  assert.match(calls[reset].sql, /is_current = FALSE/);
  assert.match(calls[insert].sql, /reason_code_id, role_id, role_name/);
  assert.deepEqual(calls[insert].params, [10, 1, 3, 7, 'Awaiting budget approval.', 4, 15, "Sales Head's role"]);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.equal(released, true);
});

test('an engagement tracker failure rolls back the opportunity and releases the transaction', async t => {
  const calls: string[] = [];
  let released = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('INSERT INTO tbl_opportunity_engage_tracker')) throw new Error('Audit insert failed');
      return { rows: sql.includes('RETURNING opportunity_id') || sql.startsWith('SELECT') ? [{ opportunityId: 10 }] : [] };
    },
    release: () => { released = true; },
  }));
  await assert.rejects(transitionWorkflow(10, 2, 4, null, 7, 'Approved', null, { roleId: 15, roleName: 'Sales Head' }), /Audit insert failed/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
  assert.equal(released, true);
});

const intakeClient = { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' };
const intakeContact = { fullName: 'Contact', titleRole: 'Manager', email: 'contact@example.com', phone: '123', roleInDecision: 1 };
const intake = { opportunityName: 'Opportunity', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 2, client: intakeClient, contacts: [intakeContact], questions: ['Delivery?'] };

test('client and intake creation write only current rows, with a separate initial workflow event', async t => {
  const calls: string[] = [];
  let reuseClient = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql.trim());
      if (sql.includes('SELECT client_id AS "clientId"')) return { rows: reuseClient ? [{ clientId: 1 }] : [] };
      if (sql.includes('SELECT client_contact_id') || sql.includes('SELECT qa_id')) return { rows: [] };
      return { rows: [{ clientId: 1, clientContactId: 21, opportunityId: 10, opportunityNumber: 'TEST-10', opportunityName: 'Opportunity', qaId: 31 }] };
    }, release: () => {},
  }));
  await createClient(intakeClient, [intakeContact], 7);
  assert.equal(calls.some(sql => /INSERT INTO \w+_tracker/.test(sql)), false);
  calls.length = 0;
  await finalizeRfpIntakeOpportunity(intake, 7, null);
  assert.equal(calls.filter(sql => /INSERT INTO \w+_tracker/.test(sql)).length, 1);
  assert.ok(calls.some(sql => sql.startsWith('INSERT INTO tbl_opportunity_engage_tracker')));
  // Selecting a client by ID does not edit or snapshot that client.
  reuseClient = true;
  calls.length = 0;
  await finalizeRfpIntakeOpportunity({ ...intake, clientId: 1 }, 7, null);
  assert.equal(calls.some(sql => sql.startsWith('INSERT INTO mst_client_tracker') || sql.startsWith('UPDATE mst_client\n')), false);
  // Reusing by name edits the existing client, so preserve its previous row.
  calls.length = 0;
  await finalizeRfpIntakeOpportunity({ ...intake, contacts: [] }, 7, null);
  assert.equal(calls.filter(sql => sql.startsWith('INSERT INTO mst_client_tracker')).length, 1);
  assert.ok(calls.findIndex(sql => sql.startsWith('INSERT INTO mst_client_tracker')) < calls.findIndex(sql => sql.startsWith('UPDATE mst_client\n')));
});

test('both client editing routes archive old clients and edited/removed contacts, without snapshots for new contacts', async t => {
  for (const fromIntake of [false, true]) {
    const calls: { sql: string; params: unknown[] }[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string, params: unknown[] = []) => {
        calls.push({ sql: sql.trim(), params });
        if (sql.includes('SELECT client_contact_id')) {
          if (sql.includes('NOT (LOWER(email)')) return { rows: [{ clientContactId: 21 }] };
          return { rows: params[1] === intakeContact.email ? [{ clientContactId: 22 }] : [] };
        }
        return { rows: [{ clientId: 1, opportunityId: 10, stageId: 1, subStageId: 1, createdBy: 7 }] };
      }, release: () => {},
    }));
    const contacts = [intakeContact, { ...intakeContact, email: 'new@example.com' }];
    if (fromIntake) await updateRfpIntakeOpportunity(10, { ...intake, contacts, questions: [] }, 7);
    else await updateClient(1, intakeClient, contacts, 7);
    for (const table of ['mst_client', ...(fromIntake ? ['tbl_opportunity'] : [])]) {
      const snapshots = calls.filter(call => call.sql.startsWith(`INSERT INTO ${table === 'mst_client' ? 'mst_client_tracker' : 'tbl_opportunity_tracker'} (`));
      assert.equal(snapshots.length, 1);
      assert.ok(calls.indexOf(snapshots[0]) < calls.findIndex(call => new RegExp(`^UPDATE ${table}\\b`).test(call.sql)));
    }
    const contactsHistory = calls.filter(call => call.sql.startsWith('INSERT INTO tbl_client_contact_person_tracker'));
    assert.deepEqual(contactsHistory.map(call => call.params), [[21], [22]]);
    assert.ok(calls.indexOf(contactsHistory[0]) < calls.findIndex(call => call.sql.startsWith('UPDATE tbl_client_contact_person SET is_active')));
    assert.ok(calls.indexOf(contactsHistory[1]) < calls.findIndex(call => call.sql.startsWith('UPDATE tbl_client_contact_person\n')));
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  }
});

test('all opportunity update routes snapshot before overwriting, and a snapshot failure prevents the change', async t => {
  for (const save of [
    () => update(10, { opportunityName: 'Changed' }, 7),
    () => updateRfpIntakeOpportunity(10, { ...intake, contacts: [], questions: [] }, 7),
    () => transitionWorkflow(10, 2, 4, null, 7, 'Approved'),
  ]) {
    for (const fail of [false, true]) {
      const calls: string[] = [];
      t.mock.method(db.pool, 'connect', async () => ({
        query: async (sql: string) => {
          calls.push(sql.trim());
          if (fail && sql.startsWith('INSERT INTO tbl_opportunity_tracker')) throw new Error('History unavailable');
          if (sql.includes('SELECT client_contact_id')) return { rows: [] };
          return { rows: [{ opportunityId: 10, clientId: 1, stageId: 1, subStageId: 1, createdBy: 7 }] };
        }, release: () => {},
      }));
      if (fail) {
        await assert.rejects(save(), /History unavailable/);
        assert.equal(calls.some(sql => sql.startsWith('UPDATE tbl_opportunity\n')), false);
        assert.equal(calls.at(-1), 'ROLLBACK');
      } else {
        await save();
        const snapshots = calls.filter(sql => sql.startsWith('INSERT INTO tbl_opportunity_tracker'));
        assert.equal(snapshots.length, 1);
        assert.ok(calls.indexOf(snapshots[0]) < calls.findIndex(sql => sql.startsWith('UPDATE tbl_opportunity\n')));
        assert.equal(calls.at(-1), 'COMMIT');
      }
    }
  }
});
