import { useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@xts/design-system';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { decisionError, readinessErrors } from '../lib/workflow';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { Field, Notice, Panel } from './ui';
import { EligibleUserSelect } from './EligibleUserSelect';

const LABELS = { SALES_APPROVE: 'Approve & Send to CEO', SALES_REJECT: 'Reject Opportunity', GATE1_GO: 'Approve Go', GATE1_NO_GO: 'Decide No-Go' };
export function ReviewActions({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [decision, setDecision] = useState<DecisionCommand['decision']>(), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [validation, setValidation] = useState<string>(), [salesId, setSalesId] = useState(''), [ceoId, setCeoId] = useState('');
  const decisions = (Object.keys(LABELS) as DecisionCommand['decision'][]).filter(action => o.allowedActions.includes(action) && (action.startsWith('SALES_') ? o.state === 'SALES_REVIEW' : o.state === 'GATE1_PENDING'));
  const errors = readinessErrors(o);
  async function decide() {
    if (!decision) return;
    const error = decisionError(o, decision, reason, confirmed); setValidation(error ?? undefined); if (error) return;
    await mutation.run(JSON.stringify({ decision, reason, revision: o.revision, packageRevision: o.packageRevision }), key => service.decide({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, packageRevision: o.packageRevision!, decision, reason: reason.trim(), confirmed }), value => { setDecision(undefined); onSaved(value); }, 'Decision recorded. Pipeline and history will use the updated opportunity.');
  }
  async function submit() {
    if (!o.allowedActions.includes('SUBMIT_SALES') || errors.length || !o.readiness.ready) return;
    if (!salesId || !ceoId) { setValidation('Select an eligible Sales Head reviewer and Gate 1 approver.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ action: 'submitSales', revision: o.revision, salesId, ceoId }), key => service.submitSales({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, salesReviewerId: salesId, gate1ApproverId: ceoId }), onSaved, 'Submitted package to Sales Head.');
  }
  return <Panel title={decisions.length ? o.state === 'SALES_REVIEW' ? 'Your sales approval is required' : 'Your Gate 1 decision is required' : 'Your next action'} tone="violet">
    {decisions.length > 0 ? <><p className="mb-4 text-sm text-muted-foreground">Review the submitted package revision {o.packageRevision}. {o.state === 'SALES_REVIEW' ? 'Sales approval sends this package to CEO; it is not a final Gate 1 Go decision.' : 'Sales Head approved this package. Record the final Go / No-Go decision.'}</p><div className="flex flex-wrap gap-3">{decisions.map(action => <Button key={action} type="button" variant={action === 'SALES_REJECT' || action === 'GATE1_NO_GO' ? 'outline' : 'default'} onClick={() => { setDecision(action); setReason(''); setConfirmed(false); setValidation(undefined); }}>{LABELS[action]}</Button>)}</div></> : o.allowedActions.includes('SUBMIT_SALES') ? <div className="space-y-4"><p className="text-sm text-muted-foreground">{errors.length ? 'Complete preparation before submitting for Sales Head approval.' : 'Response preparation is complete.'}</p>{errors.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{errors.map(error => <li key={error}>{error}</li>)}</ul>}<div className="opp-fields"><EligibleUserSelect label="Sales Head reviewer" opportunityId={o.id} purpose="SALES_REVIEWER" value={salesId} onChange={setSalesId} disabled={mutation.saving} /><EligibleUserSelect label="CEO / Gate 1 approver" opportunityId={o.id} purpose="GATE1_APPROVER" value={ceoId} onChange={setCeoId} disabled={mutation.saving} /></div><Button type="button" disabled={mutation.saving || errors.length > 0 || !o.readiness.ready} onClick={() => void submit()}>Submit to Sales Head</Button></div> : <p className="text-sm text-muted-foreground">No decision action is assigned to you for this revision. The recorded status and history remain available.</p>}
    {!decision && validation && <Notice error={validation} />}{!decision && mutation.error && <Notice error={mutation.error} />}
    <Dialog open={Boolean(decision)} onOpenChange={open => { if (!open && !mutation.saving) setDecision(undefined); }}><DialogContent className="opp-dialog"><DialogHeader><DialogTitle>{decision ? LABELS[decision] : 'Review decision'}</DialogTitle><DialogDescription>{o.number} · package revision {o.packageRevision}. {decision === 'SALES_APPROVE' ? 'This advances to Gate 1 pending for the assigned CEO / Approver.' : decision === 'GATE1_GO' ? 'This records final Gate 1 Go for the reviewed package.' : 'The opportunity is retained with its decision history and does not advance.'}</DialogDescription></DialogHeader><Field label={decision === 'SALES_REJECT' || decision === 'GATE1_NO_GO' ? 'Reason (required)' : 'Decision note (optional)'} value={reason} onChange={setReason} multiline disabled={mutation.saving} /><Label className="flex items-start gap-3 leading-relaxed"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} disabled={mutation.saving} />I have reviewed this opportunity and response package revision {o.packageRevision}.</Label>{validation && <Notice error={validation} />}{mutation.error && <Notice error={mutation.error} />}<DialogFooter><Button type="button" variant="outline" disabled={mutation.saving} onClick={() => setDecision(undefined)}>Cancel</Button><Button type="button" disabled={mutation.saving} onClick={() => void decide()}>{mutation.saving ? 'Recording…' : 'Confirm decision'}</Button></DialogFooter></DialogContent></Dialog>
  </Panel>;
}
