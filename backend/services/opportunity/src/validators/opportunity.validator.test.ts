import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  type OpportunityInputLike,
  validateCreateOpportunity,
  validateUpdateOpportunity,
} from './opportunity.validator';

const validInput: OpportunityInputLike = {
  opportunityName: 'Client budget test',
  opportunityTypeId: 1,
  sourceTypeId: 1,
  clientId: 1,
  ownerId: 7,
  priority: 'MEDIUM',
  serviceLine: 'Consulting',
  estimatedValue: 100,
  estimatedValueUsd: 100,
};

for (const [operation, validate] of [
  ['create', validateCreateOpportunity],
  ['update', validateUpdateOpportunity],
] as const) {
  test(`${operation} requires positive client budgets in both currencies`, () => {
    for (const [field, label] of [
      ['estimatedValue', 'Client budget'],
      ['estimatedValueUsd', 'Client budget (USD)'],
    ] as const) {
      for (const value of [0, -0, -1, -0.01, NaN, Infinity, -Infinity, 0.000001]) {
        assert.throws(() => validate({ ...validInput, [field]: value }),
          (error: unknown) => error instanceof Error && error.message.includes(`${label} must be greater than zero.`),
          `${field} accepted ${value}`);
      }
      for (const value of [null, undefined]) {
        assert.throws(() => validate({ ...validInput, [field]: value }),
          (error: unknown) => error instanceof Error && error.message.includes(`${label} is required.`));
      }
    }
  });

  test(`${operation} accepts positive client budgets and preserves existing currency precision and limits`, () => {
    for (const value of [0.01, 1, 123.45, 9999999999999.99]) {
      assert.doesNotThrow(() => validate({ ...validInput, estimatedValue: value, estimatedValueUsd: value }));
    }
    // Local-currency inputs retain their existing database rounding behavior.
    assert.doesNotThrow(() => validate({ ...validInput, estimatedValue: 1.235 }));
    assert.throws(() => validate({ ...validInput, estimatedValue: 1e13 }), /Client budget must fit numeric\(15,2\)/);
    assert.throws(() => validate({ ...validInput, estimatedValue: 9999999999999.998 }), /Client budget must fit numeric\(15,2\)/);
    assert.throws(() => validate({ ...validInput, estimatedValueUsd: 1e13 }), /Client budget \(USD\) must fit numeric\(15,2\)/);
    assert.throws(() => validate({ ...validInput, estimatedValueUsd: 1.235 }), /at most two decimals/);
  });
}
