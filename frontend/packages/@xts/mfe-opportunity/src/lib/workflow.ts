import type { Action, Decimal, DirectoryUser, EstimateRow, OpportunityDetail, OpportunityDraft, PreparedQuestion, ResponseItem, RfpQuestion } from '@xts/api-contracts';

export const STATE_LABELS = {
  PREPARATION_PENDING: 'Draft', IN_PROGRESS: 'In progress', SALES_REVIEW: 'Pending', GATE1_PENDING: 'Gate 1 pending', HOLD: 'Hold',
  GATE1_GO: 'Gate 1 Go', SALES_REJECTED: 'Rejected by Sales Head', GATE1_NO_GO: 'Closed · No-Go',
};
export const RESPONSE_LABELS = { UNASSIGNED: 'Unassigned', ASSIGNED: 'Assigned', DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', CHANGES_REQUESTED: 'Changes requested' };
export const SECTION_CATALOG = [
  { key: 'understanding', title: 'Understanding of requirements', category: 'Overview', description: 'Interpretation of client needs and intended outcomes.' },
  { key: 'references', title: 'Experience & references', category: 'Overview', description: 'Relevant engagements and customer references.' },
  { key: 'summary', title: 'Executive summary', category: 'Overview', description: 'Understanding of the client and proposed value.' },
  { key: 'company', title: 'Company credentials', category: 'Overview', description: 'Experience, capabilities and relevant references.' },
  { key: 'plan', title: 'Project plan & timeline', category: 'Technical', description: 'Schedule, milestones and delivery phases.' },
  { key: 'team', title: 'Team & key personnel', category: 'Technical', description: 'Roles, skills and staffing approach.' },
  { key: 'scope', title: 'Scope & deliverables', category: 'Technical', description: 'Proposed solution, boundaries and deliverables.' },
  { key: 'approach', title: 'Technical approach & solution', category: 'Technical', description: 'Methodology, milestones and dependencies.' },
  { key: 'security', title: 'Security & compliance', category: 'Technical', description: 'Controls, standards and risk management.' },
  { key: 'assumptions', title: 'Assumptions & dependencies', category: 'Commercial', description: 'Dependencies, exclusions and key assumptions.' },
  { key: 'pricing', title: 'Pricing & commercials', category: 'Commercial', description: 'Cost breakdown, terms and assumptions.' },
  { key: 'support', title: 'Support & service levels', category: 'Commercial', description: 'Support model, commitments and escalation.' },
] as const;
export const CONTEXT_FIELDS = { instructions: 'Instructions', submissionRequirements: 'Submission requirements', opportunityOverview: 'Opportunity overview', scopeOfWork: 'Scope of work', requirements: 'Key technical / functional requirements', notes: 'Notes' };
export const SCOPE_FIELDS = { objective: 'Objective', deliverables: 'Deliverables', inclusions: 'Inclusions', exclusions: 'Exclusions', dependencies: 'Dependencies / assumptions', acceptance: 'Acceptance criteria' };

/** Snapshot templates into this opportunity; editing copies never edits masters. */
export function addMasterQuestionTemplates(questions: PreparedQuestion[], templates: RfpQuestion[]): PreparedQuestion[] {
  const selected = new Set(questions.flatMap(question => question.masterQuestionId == null ? [] : [question.masterQuestionId]));
  const additions: PreparedQuestion[] = [];
  for (const template of templates) {
    if (!template.isActive || selected.has(template.id) || !template.question.trim()) continue;
    selected.add(template.id);
    additions.push({ id: `draft-${crypto.randomUUID()}`, masterQuestionId: template.id, text: template.question, sourceReference: `Question Master #${template.id}`, validated: false });
  }
  return [...questions, ...additions];
}

export function newDraft(ownerId: string): OpportunityDraft {
  return {
    title: '', estimatedValue: '', currencyId: '', serviceLine: '', leadSource: '', ownerId, priority: 'MEDIUM', description: '', clientId: null,
    solicitation: { reference: '', version: '', issuingAgency: '', procurementContact: '', submissionMethod: 'PORTAL', vendorDemo: 'UNCONFIRMED', portalUrl: '', submissionEmail: '', deliveryInstructions: '', contractTerm: '', incumbentVendor: '', preBidMeeting: 'UNCONFIRMED', submissionTimezone: 'Asia/Kolkata' },
    dates: { issueDate: '', questionsDue: '', proposalDue: '', submissionDeadline: '', additionalDeadline: '', additionalDeadlineLabel: '' },
    context: { instructions: '', submissionRequirements: '', opportunityOverview: '', scopeOfWork: '', requirements: '', notes: '' },
    rfp: { type: null, source: null, extraction: null, questions: [], sections: [], submissionFormat: 'TECHNICAL_COST', outputFormat: 'PDF', pageRules: '', evaluation: '' },
  };
}
export function isPreparing(o: OpportunityDetail) { return o.state === 'PREPARATION_PENDING' || o.state === 'IN_PROGRESS' || o.state === 'SALES_REVIEW'; }
export function may(o: OpportunityDetail, action: Action) { return o.allowedActions.includes(action); }
export function canAnswer(o: OpportunityDetail, r: ResponseItem, userId: string | undefined) {
  return isPreparing(o) && r.owner?.active === true && r.owner.id === userId && ['ASSIGNED', 'DRAFT', 'CHANGES_REQUESTED'].includes(r.state);
}
export function canReview(o: OpportunityDetail, r: ResponseItem, userId: string | undefined) {
  return isPreparing(o) && r.state === 'SUBMITTED' && r.reviewer?.active === true && r.reviewer.id === userId && r.owner?.id !== userId && r.submittedRevision === r.revision;
}
export function userLabel(user: DirectoryUser | null) { return user ? `${user.name || user.email}${user.active ? '' : ' (inactive)'}` : 'Unassigned'; }
export function pendingSaveFieldErrors(form: OpportunityDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) errors.title = 'Enter an opportunity name.';
  if (!/^\d+(\.\d{1,2})?$/.test(form.estimatedValue) || !/[1-9]/.test(form.estimatedValue)) errors.estimatedValue = 'Enter an estimated value greater than zero with at most two decimals.';
  if (!form.currencyId) errors.currencyId = 'Select a currency.';
  if (!form.serviceLine.trim()) errors.serviceLine = 'Select a service line.';
  if (!form.leadSource.trim()) errors.leadSource = 'Select a lead source.';
  if (!form.ownerId) errors.ownerId = 'Select an opportunity owner.';
  if (!form.rfp.type) errors['rfp.type'] = 'Choose an RFP type.';
  if (!form.clientId) errors.clientId = 'Select a client.';
  if (!form.solicitation.reference.trim()) errors['solicitation.reference'] = 'Enter a solicitation / reference number.';
  if (!form.solicitation.issuingAgency.trim()) errors['solicitation.issuingAgency'] = 'Enter an issuing agency / department.';
  if (!['PORTAL', 'EMAIL', 'PHYSICAL'].includes(form.solicitation.submissionMethod)) errors['solicitation.submissionMethod'] = 'Select a submission method.';
  if (!form.dates.submissionDeadline) errors['dates.submissionDeadline'] = 'Set a submission deadline.';
  for (const field of ['questionsDue', 'submissionDeadline'] as const) {
    const value = form.dates[field];
    if (value && !validDate(value)) errors[`dates.${field}`] = `Enter a valid date for ${field}.`;
  }
  if (validDate(form.dates.questionsDue) && validDate(form.dates.submissionDeadline) && form.dates.questionsDue > form.dates.submissionDeadline) {
    errors['dates.questionsDue'] = 'Questions due date cannot be later than the submission deadline.';
  }
  return errors;
}
export function pendingSaveErrors(form: OpportunityDraft): string[] {
  return Object.values(pendingSaveFieldErrors(form));
}
export function readinessErrors(o: OpportunityDetail): string[] {
  const f = o.form, errors = pendingSaveErrors(f);
  const destination = f.solicitation.submissionMethod === 'PORTAL' ? f.solicitation.portalUrl : f.solicitation.submissionMethod === 'EMAIL' ? f.solicitation.submissionEmail : f.solicitation.deliveryInstructions;
  if (f.solicitation.submissionMethod !== 'PORTAL' && !destination.trim()) errors.push('Complete the submission destination.');
  if (f.solicitation.submissionMethod === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) errors.push('Enter a valid submission email.');
  const responses = o.responses ?? [];
  if (!responses.length) errors.push('Prepare at least one response item.');
  if (responses.some(r => !r.owner?.active || !r.reviewer?.active || r.owner.id === r.reviewer.id || !r.dueDate)) errors.push('Assign active owners, independent reviewers and due dates.');
  if (responses.some(r => r.state !== 'APPROVED' || r.approvedRevision !== r.revision)) errors.push('Approve every current response revision.');
  return [...new Set([...errors, ...o.readiness.issues])];
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const days = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
}
/** Exact fixed-point calculation; round each row to currency minor units. */
export function rowAmount(row: EstimateRow): Decimal {
  const scaled = (v: string) => { if (!/^\d+(\.\d{1,4})?$/.test(v)) throw new Error('Use non-negative decimals with at most four decimal places.'); const [a, b = ''] = v.split('.'); return BigInt(a) * 10000n + BigInt(b.padEnd(4, '0')); };
  if (!Number.isSafeInteger(row.people) || row.people < 1) throw new Error('People must be a positive whole number.');
  const minor = (scaled(row.hours) * scaled(row.hourlyRate) * BigInt(row.people) + 500000n) / 1000000n;
  return `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
}
export function estimateTotal(rows: EstimateRow[]): Decimal {
  const cents = rows.reduce((sum, row) => sum + BigInt(rowAmount(row).replace('.', '')), 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
export function money(value: Decimal, code: string) {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(Number(value)); }
  catch { return `${code} ${value}`; }
}
export function requiresDecisionReason(decision: Action) { return ['SALES_REJECT', 'GATE1_NO_GO', 'SALES_HOLD', 'GATE1_HOLD'].includes(decision); }
export function isSalesDecisionStage(o: Pick<OpportunityDetail, 'state' | 'holdStage'>) { return o.state === 'SALES_REVIEW' || o.state === 'HOLD' && o.holdStage === 'SALES_REVIEW'; }
export function isCeoDecisionStage(o: Pick<OpportunityDetail, 'state' | 'holdStage'>) { return o.state === 'GATE1_PENDING' || o.state === 'HOLD' && o.holdStage === 'GATE1_PENDING'; }
export function decisionError(o: OpportunityDetail, decision: Action, _reason: string, confirmed: boolean, reasonCodeId?: number | null): string | null {
  if (!may(o, decision)) return 'You are not permitted to make this decision.';
  if ((decision.startsWith('SALES_') && !isSalesDecisionStage(o)) || (decision.startsWith('GATE1_') && !isCeoDecisionStage(o))) return 'This package is no longer awaiting this decision. Refresh the opportunity.';
  if (o.packageRevision === null) return 'There is no submitted package to review.';
  if (!confirmed) return 'Confirm that you reviewed this package revision.';
  if (requiresDecisionReason(decision) && (!Number.isSafeInteger(reasonCodeId) || (reasonCodeId ?? 0) <= 0)) return 'Select a reason from Reason details.';
  return null;
}
