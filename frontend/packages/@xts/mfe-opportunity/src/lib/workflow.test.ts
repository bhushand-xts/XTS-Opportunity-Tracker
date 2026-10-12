import { describe, expect, it } from 'vitest';
import { addMasterQuestionTemplates, canAnswer, canReview, decisionError, estimateTotal, pendingSaveErrors, readinessErrors, SECTION_CATALOG, validDate } from './workflow';
import type { RfpQuestion } from '@xts/api-contracts';
import { fixtureOpportunity } from '../testing/fixtures';

describe('workflow boundaries', () => {
  it('copies active master questions with stable provenance and prevents duplicate imports', () => {
    const template: RfpQuestion = { id: 17, question: 'Describe your delivery approach.', description: 'Delivery template', displayOrder: 1, isActive: true, createdDt: null, updatedDt: null };
    const questions = addMasterQuestionTemplates([], [template, template, { ...template, id: 18, isActive: false }]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ masterQuestionId: 17, text: template.question, validated: false, sourceReference: 'Question Master #17' });
    expect(questions[0].id).toMatch(/^draft-/);
    const edited = [{ ...questions[0], text: 'Opportunity-specific wording.' }];
    expect(addMasterQuestionTemplates(edited, [template])).toEqual(edited);
    expect(template.question).toBe('Describe your delivery approach.');
  });
  it('keeps Pending preparation out of the decision stage', () => {
    const o = fixtureOpportunity({ allowedActions: ['SALES_APPROVE'], packageRevision: 1 });
    expect(decisionError(o, 'SALES_APPROVE', '', true)).toContain('no longer awaiting');
    expect(readinessErrors(o)).toContain('Approve every current response revision.');
  });
  it('requires rejection reasons and review confirmation', () => {
    const o = fixtureOpportunity({ state: 'GATE1_PENDING', allowedActions: ['GATE1_GO', 'GATE1_NO_GO'], packageRevision: 2 });
    expect(decisionError(o, 'GATE1_NO_GO', '', true)).toContain('reason');
    expect(decisionError(o, 'GATE1_GO', '', false)).toContain('Confirm');
    expect(decisionError(o, 'GATE1_GO', '', true)).toBeNull();
    expect(decisionError(o, 'SALES_APPROVE', '', true)).toContain('not permitted');
  });
  it('only lets an active assigned owner answer and an independent reviewer approve the submitted revision', () => {
    const o = fixtureOpportunity(), r = o.responses![0];
    expect(canAnswer(o, r, '101')).toBe(true);
    expect(canAnswer(o, r, '102')).toBe(false);
    const submitted = { ...r, state: 'SUBMITTED' as const, submittedRevision: 1 };
    expect(canReview(o, submitted, '102')).toBe(true);
    expect(canReview(o, { ...submitted, reviewer: r.owner }, '101')).toBe(false);
    expect(canReview(o, { ...submitted, submittedRevision: 0 }, '102')).toBe(false);
    expect(canReview({ ...o, state: 'SALES_REVIEW' }, submitted, '102')).toBe(false);
  });
  it('requires current approvals while permitting incomplete RFP draft saves', () => {
    const o = fixtureOpportunity();
    o.form.rfp.type = null;
    expect(pendingSaveErrors(o.form)).toEqual([]);
    expect(readinessErrors(o)).toContain('Choose an RFP type.');
    o.responses![0].state = 'APPROVED'; o.responses![0].approvedRevision = 0;
    expect(readinessErrors(o)).toContain('Approve every current response revision.');
  });
  it('uses exact decimal calculations and rejects fractional people', () => {
    expect(estimateTotal([{ id: '1', workItem: 'Test', hours: '0.1', people: 3, hourlyRate: '0.2' }])).toBe('0.06');
    expect(() => estimateTotal([{ id: '1', workItem: 'Test', hours: '1', people: 1.5, hourlyRate: '1' }])).toThrow('whole number');
  });
  it('preserves date-only values and validates calendars without UTC conversions', () => {
    expect(validDate('2028-02-29')).toBe(true); expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2026-11-25T00:00:00Z')).toBe(false);
  });
  it('includes all original and restored proposal sections', () => {
    expect(SECTION_CATALOG).toHaveLength(12);
    expect(SECTION_CATALOG.map(x => x.key)).toEqual(expect.arrayContaining(['understanding', 'plan', 'team', 'references', 'assumptions', 'summary', 'company', 'scope', 'approach', 'security', 'pricing', 'support']));
  });
});
