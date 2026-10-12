import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSchema, parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';
import { productionOpportunityService } from './OpportunityService';
import { newDraft } from '../lib/workflow';
import * as proposed from './proposed/workflow.queries';

describe('proposed contract isolation', () => {
  it('validates handoff operations against the proposed schema without adding them to the production schema', () => {
    const root = resolve(process.cwd(), '../docs/opportunity/contracts');
    const schema = buildSchema(readFileSync(resolve(root, 'opportunity-workflow.proposed.graphql'), 'utf8'));
    const documents = parse(readFileSync(resolve(root, 'opportunity-workflow.operations.graphql'), 'utf8'));
    expect(validate(schema, documents)).toEqual([]);
    for (const [name, operation] of Object.entries(proposed)) {
      if (name.endsWith('_FIELDS')) continue;
      expect(validate(schema, operation), name).toEqual([]);
    }
  });
  it('fails closed for stub list and missing persistence instead of claiming success or returning sample data', async () => {
    await expect(productionOpportunityService.list({ search: '', queue: 'PIPELINE', after: null, first: 50 })).rejects.toMatchObject({ code: 'INTEGRATION_UNAVAILABLE' });
    await expect(productionOpportunityService.save({ id: null, expectedRevision: null, idempotencyKey: 'test', form: newDraft('101') })).rejects.toMatchObject({ code: 'INTEGRATION_UNAVAILABLE' });
  });
});
