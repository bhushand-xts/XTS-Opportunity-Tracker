import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimationPayload, restoreEstimation } from '../lib/estimationPersistence';
import { estimationWritable, estimationRatesWritable } from '../lib/opportunityPreparation';
import type { OpportunityEstimation } from './opportunity.repository';

test('allocation, rates, effort and USD costs round-trip without losing precision', () => {
  const input: OpportunityEstimation = { revision: 2, status: 'DRAFT', assumptions: 'Exact snapshot', total: '250.25', grid: null,
    rows: [{ id: 'r', workItem: 'Engineering', hours: '1.25', people: 2, hourlyRate: '100.10' }] };
  const payload = estimationPayload(input);
  assert.equal(payload.effort.total, '0.0625');
  assert.equal(payload.cost.total, '250.25');
  assert.equal(payload.cost.currencyCode, 'USD');
  assert.deepEqual(restoreEstimation({ revision: 2, resource_allocation: payload.allocation, rate_snapshot: payload.rates, person_weeks_cost: payload.cost }), input);
});
test('estimates remain writable through CEO review and lock after approval', () => {
  for (const [stageId, subStageId] of [[3,7],[4,8],[4,9]]) assert.equal(estimationWritable({ stageId, subStageId }), true);
  for (const [stageId, subStageId] of [[4,5],[5,10],[6,12],[7,13],[8,14],[9,17],[10,19]]) assert.equal(estimationWritable({ stageId, subStageId }), false);
});

test('CEO rates can be edited only during pending or held estimation review', () => {
  for (const subStageId of [8, 9]) assert.equal(estimationRatesWritable({ stageId: 4, subStageId }), true);
  for (const [stageId, subStageId] of [[3,7], [4,5], [5,10], [5,11], [6,12], [7,13], [8,14], [9,17], [10,19]]) {
    assert.equal(estimationRatesWritable({ stageId, subStageId }), false);
  }
});

test('snapshot stores displayed billing rates by role once and calculates costs from unrounded monthly rates for every phase', () => {
  const input: OpportunityEstimation = { revision: 1, assumptions: '', total: '0',
    rates: [{ roleCode: 'BA', rate: '345465.03', rateType: 'Monthly', currencyCode: 'USD' }, { roleCode: 'qa', rate: '120', rateType: 'Monthly', currencyCode: 'USD' }],
    grid: { phaseIds: [1, 5], roleCodes: ['BA', 'qa'], durations: [], allocations: [] },
    rows: [1, 5].flatMap(id => ['BA', 'qa'].map(code => ({ id: `grid-${id}-${code}`, workItem: code, hours: '80', people: 1, hourlyRate: '9999' }))) };
  const payload = estimationPayload(input);
  assert.deepEqual(payload.rates.roles, { BA: { rate: '345465.03', rateType: 'Monthly', currencyCode: 'USD' }, qa: { rate: '120', rateType: 'Monthly', currencyCode: 'USD' } });
  assert.deepEqual(payload.rates.legacyRows, []);
  assert.equal(payload.cost.total, '345585.04');
  assert.equal(payload.cost.rows[0].cost, '172732.52', 'Do not round a derived hourly rate before applying the monthly formula');
  const restored = restoreEstimation({ revision: 1, resource_allocation: payload.allocation, rate_snapshot: payload.rates, person_weeks_cost: payload.cost });
  assert.deepEqual(restored.rates, input.rates);
  assert.deepEqual(restored.rows.map(row => row.hourlyRate), ['2159.1564', '0.7500', '2159.1564', '0.7500']);
});

test('Project Manager uses duration times allocation, then monthly rate divided by 20 times person-weeks times 5', () => {
  const input: OpportunityEstimation = { revision: 1, assumptions: '', total: '0',
    rates: [{ roleCode: 'PM', rate: '4000', rateType: 'Monthly', currencyCode: 'USD' }],
    grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.25' }] },
    rows: [{ id: 'grid-1-PM', workItem: 'Project Manager', hours: '20', people: 1, hourlyRate: '25' }] };
  const payload = estimationPayload(input);
  assert.equal(payload.effort.total, '0.5');
  assert.equal(payload.cost.total, '500.00');
  assert.equal(payload.cost.rows[0].cost, '500.00');
});

test('old hourly snapshots remain readable and retain the original price', () => {
  const restored = restoreEstimation({ revision: 1, resource_allocation: { schemaVersion: 1, status: 'DRAFT', assumptions: '', grid: null, rows: [{ id: 'old', workItem: 'Old task', hours: '40', people: 1 }] },
    rate_snapshot: { rows: [{ id: 'old', hourlyRate: '25' }] }, person_weeks_cost: { total: '1000.00', currencyCode: 'USD', rows: [] } });
  assert.equal(restored.rows[0].hourlyRate, '25');
  assert.equal(estimationPayload(restored).cost.total, '1000.00');
});
