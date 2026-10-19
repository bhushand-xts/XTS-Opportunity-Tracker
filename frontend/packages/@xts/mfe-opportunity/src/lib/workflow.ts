import type { Action, Decimal, DirectoryUser, EstimateRow, LookupOption, OpportunityDetail, OpportunityDraft, PreparedQuestion, ResponseItem, RfpQuestion } from '@xts/api-contracts';
import { randomUUID } from './uuid';

export const STATE_LABELS = {
  PREPARATION_PENDING: 'Draft', IN_PROGRESS: 'In progress', SALES_REVIEW: 'Pending', GATE1_PENDING: 'Gate 1 pending',
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
export const RISK_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const RISK_SEVERITY_LABELS = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
export const RISK_SEVERITY_OPTIONS: LookupOption[] = RISK_SEVERITIES.map(id => ({ id, label: RISK_SEVERITY_LABELS[id] }));

/** Snapshot templates into this opportunity; editing copies never edits masters. */
export function addMasterQuestionTemplates(questions: PreparedQuestion[], templates: RfpQuestion[]): PreparedQuestion[] {
  const selected = new Set(questions.flatMap(question => question.masterQuestionId == null ? [] : [question.masterQuestionId]));
  const additions: PreparedQuestion[] = [];
  for (const template of templates) {
    if (!template.isActive || selected.has(template.id) || !template.question.trim()) continue;
    selected.add(template.id);
    additions.push({ id: `draft-${randomUUID()}`, masterQuestionId: template.id, text: template.question, sourceReference: `Question Master #${template.id}`, validated: false });
  }
  return [...questions, ...additions];
}

export function newDraft(ownerId: string): OpportunityDraft {
  return {
    title: '', estimatedValue: '', estimatedValueUsd: '', serviceLineOther: '', currencyId: '', serviceLine: '', leadSource: '', ownerId, priority: '', description: '', clientId: null,
    solicitation: { reference: '', version: '', issuingAgency: '', procurementContact: '', submissionMethod: '', vendorDemo: 'UNCONFIRMED', portalUrl: '', submissionEmail: '', deliveryInstructions: '', contractTerm: '', incumbentVendor: '', preBidMeeting: '', submissionTimezone: 'Asia/Kolkata' },
    dates: { issueDate: '', questionsDue: '', proposalDue: '', submissionDeadline: '', additionalDeadline: '', additionalDeadlineLabel: '' },
    context: { instructions: '', submissionRequirements: '', opportunityOverview: '', scopeOfWork: '', requirements: '', notes: '' },
    rfp: { type: 'GENERIC', source: null, extraction: null, questions: [], sections: [], submissionFormat: 'TECHNICAL_COST', outputFormat: 'PDF', evaluation: '' },
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
  if (!form.title.trim()) errors['Opportunity name / title'] = 'Please fill the Opportunity name.';
  if (!form.estimatedValue.trim()) errors['Estimated value'] = 'Please fill the Estimated value.';
  else if (!/^\d+(\.\d{1,2})?$/.test(form.estimatedValue)) errors['Estimated value'] = 'Please enter a non-negative Estimated value with at most two decimals.';
  if (!form.estimatedValueUsd?.trim()) errors['Estimated value (USD)'] = 'Please fill the Estimated value (USD).';
  else if (!/^\d+(\.\d{1,2})?$/.test(form.estimatedValueUsd) || Number(form.estimatedValueUsd) >= 1e13) errors['Estimated value (USD)'] = 'Enter a non-negative USD value with at most two decimals, below 10 trillion.';
  if (form.serviceLine === 'Other' && !form.serviceLineOther?.trim()) errors['Other service line'] = 'Please fill the Other service line.';
  if ((form.serviceLine === 'Other' ? form.serviceLineOther ?? '' : form.serviceLine).trim().length > 255) errors[form.serviceLine === 'Other' ? 'Other service line' : 'Service line'] = 'Service line must be at most 255 characters.';
  if (!form.currencyId) errors['Currency'] = 'Please select a Currency.';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(form.priority)) errors.Priority = 'Please select a Priority.';
  if (!form.serviceLine.trim()) errors['Service line'] = 'Please select a Service line.';
  if (!form.ownerId) errors['Opportunity owner'] = 'Please select an Opportunity owner.';
  if (!form.clientId) errors['Client'] = 'Please select a Client.';
  if (!form.solicitation.reference.trim()) errors['Solicitation / reference number'] = 'Please fill the Solicitation / reference number.';
  if (!form.solicitation.issuingAgency.trim()) errors['Issuing agency / department'] = 'Please fill the Issuing agency / department.';
  if (!['PORTAL', 'EMAIL', 'PHYSICAL'].includes(form.solicitation.submissionMethod)) errors['Submission method'] = 'Please select a Submission method.';
  if (!form.dates.submissionDeadline) errors['Submission deadline'] = 'Please fill the Submission deadline.';
  if (!form.rfp.type) errors['RFP type'] = 'Please choose an RFP type.';
  for (const field of ['questionsDue', 'submissionDeadline'] as const) {
    const value = form.dates[field];
    if (value && !validDate(value)) errors[field === 'questionsDue' ? 'Questions due' : 'Submission deadline'] = 'Please enter a valid date.';
  }
  return errors;
}
export function pendingSaveErrors(form: OpportunityDraft): string[] {
  return Object.values(pendingSaveFieldErrors(form));
}
export function readinessErrors(o: OpportunityDetail): string[] {
  const f = o.form, errors = pendingSaveErrors(f);
  if (!f.rfp.type) errors.push('Choose an RFP type.');
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
export function decisionError(o: OpportunityDetail, decision: Action, reason: string, confirmed: boolean, reasonCodeId?: number | null): string | null {
  if (!may(o, decision)) return 'You are not permitted to make this decision.';
  if (o.stageId != null) {
    if (!applicableDecisions(o).includes(decision)) return 'This opportunity is no longer awaiting this decision. Refresh the opportunity.';
    if (decision.endsWith('_HOLD') || ['SALES_REJECT', 'GATE1_NO_GO', 'ESTIMATE_REJECT'].includes(decision)) {
      const label = decision.endsWith('_HOLD') ? 'hold' : 'rejection';
      if (!Number.isSafeInteger(reasonCodeId) || (reasonCodeId ?? 0) <= 0) return `Select a ${label} reason.`;
      if (!reason.trim()) return `Enter a ${label} description.`;
    }
    if (decision === 'SUBMIT_ESTIMATE' && !o.estimation?.rows.length) return 'Save an estimation with at least one work item before submitting for CEO approval.';
    if (decision.endsWith('_REQUEST_CHANGES') && !reason.trim()) return 'Enter the changes requested before returning the opportunity.';
    return null;
  }
  if ((decision.startsWith('SALES_') && o.state !== 'SALES_REVIEW') || (decision.startsWith('GATE1_') && o.state !== 'GATE1_PENDING')) return 'This package is no longer awaiting this decision. Refresh the opportunity.';
  if (o.packageRevision === null) return 'There is no submitted package to review.';
  if (!confirmed) return 'Confirm that you reviewed this package revision.';
  if ((decision === 'SALES_REJECT' || decision === 'GATE1_NO_GO') && !reason.trim()) return 'Enter a reason for this decision.';
  return null;
}

export function applicableDecisions(o: OpportunityDetail): Action[] {
  const stage = o.stageId, substage = o.subStageId;
  const decisions: Action[] = [];
  if (stage === 1 && [1, 3].includes(substage ?? 0)) decisions.push('SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'SALES_REJECT');
  if (stage === 2 && [4, 6].includes(substage ?? 0)) decisions.push('GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD', 'GATE1_NO_GO');
  if (stage === 1 && substage === 2 || stage === 2 && substage === 5) decisions.push('RESUBMIT');
  if (stage === 3 && substage === 7) decisions.push('SUBMIT_ESTIMATE');
  if (stage === 4 && [8, 9].includes(substage ?? 0)) decisions.push('ESTIMATE_APPROVE', 'ESTIMATE_HOLD', 'ESTIMATE_REJECT');
  if (stage === 5 && substage === 10) decisions.push('BID_SUBMITTED');
  if (stage === 5 && substage === 11) decisions.push('START_NEGOTIATION');
  if (stage === 6 && substage === 12) decisions.push('MARK_WON', 'MARK_LOST');
  if ([1, 2, 3, 4, 5, 6].includes(stage ?? 0)) decisions.push('CLOSE_OPPORTUNITY');
  return decisions;
}
