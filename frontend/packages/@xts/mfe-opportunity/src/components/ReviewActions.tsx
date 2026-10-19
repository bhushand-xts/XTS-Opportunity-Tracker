import { useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@xts/design-system';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { applicableDecisions, decisionError } from '../lib/workflow';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { Field, Notice, Panel } from './ui';
import { useCallback, useId } from 'react';
import { useResource } from '../hooks/useResource';

const LABELS: Record<DecisionCommand['decision'], string> = {
  SALES_APPROVE: 'Approve & Send to CEO',
  SALES_REQUEST_CHANGES: 'Request Changes',
  SALES_HOLD: 'Put On Hold',
  SALES_REJECT: 'Reject Opportunity',
  GATE1_GO: 'Approve Go',
  GATE1_REQUEST_CHANGES: 'Request Changes',
  GATE1_HOLD: 'Put On Hold',
  GATE1_NO_GO: 'Reject Opportunity',
  SUBMIT_ESTIMATE: 'Submit Estimation to CEO',
  ESTIMATE_APPROVE: 'Approve Estimation',
  ESTIMATE_HOLD: 'Put Estimation On Hold',
  ESTIMATE_REJECT: 'Reject Estimation',
  BID_SUBMITTED: 'Bid Submitted',
  START_NEGOTIATION: 'Under Negotiation',
  MARK_WON: 'Won',
  MARK_LOST: 'Lost',
  CLOSE_OPPORTUNITY: 'Close Opportunity',
  RESUBMIT: 'Resubmit for Review',
};
const LEGACY_DECISIONS: DecisionCommand['decision'][] = ['SALES_APPROVE', 'SALES_REJECT', 'GATE1_GO', 'GATE1_NO_GO'];

function decisionDescription(o: OpportunityDetail, decision: DecisionCommand['decision'], staged: boolean) {
  if (decision === 'RESUBMIT') return `After saving your changes, resubmit this opportunity to ${o.stageId === 1 ? 'Sales Head / Pending Review' : 'CEO / Pending Go/No-Go'}.`;
  if (!staged) return decision === 'SALES_APPROVE'
    ? 'This advances to Gate 1 pending for the assigned CEO / Approver.'
    : decision === 'GATE1_GO'
      ? 'This records final Gate 1 Go for the reviewed package.'
      : 'The opportunity is retained with its decision history and does not advance.';
  if (decision === 'SALES_APPROVE') return 'Approval moves this opportunity to Qualifying (Go/No-Go) / Pending Go/No-Go for CEO approval.';
  if (decision === 'GATE1_GO') return 'Approval moves this opportunity to Solution/Scoping Estimation (Engineering) / In Progress.';
  const descriptions: Partial<Record<DecisionCommand['decision'], string>> = {
    SALES_REJECT: 'This closes the opportunity as No-Bid / Declined · Rejected by Sales Head.',
    GATE1_NO_GO: 'This closes the opportunity as No-Bid / Declined · No-Go by CEO.',
    ESTIMATE_REJECT: 'This closes the opportunity as No-Bid / Declined · Estimate Rejected by CEO.',
    SUBMIT_ESTIMATE: 'The saved estimation is sent to CEO: Estimate Review & Approval · Pending Approval.',
    ESTIMATE_APPROVE: 'Approval moves this opportunity to Proposal / Bid Submitted · Proposal In Preparation.',
    BID_SUBMITTED: 'This records Proposal / Bid Submitted · Bid Submitted.',
    START_NEGOTIATION: 'This moves the opportunity to Negotiation · Under Negotiation.',
    MARK_WON: 'This closes the opportunity as Closed — Won · Won.',
    MARK_LOST: 'This closes the opportunity as Closed — Lost · Lost.',
    CLOSE_OPPORTUNITY: 'This closes the opportunity as No-Bid / Declined · Closed by Sales.',
  };
  if (descriptions[decision]) return descriptions[decision];
  const stage = o.stageId === 1 ? 'Identified' : o.stageId === 4 ? 'Estimate Review & Approval' : 'Qualifying (Go/No-Go)';
  return decision.endsWith('REQUEST_CHANGES')
    ? `The opportunity stays in ${stage} and returns to the ${o.stageId === 1 ? 'Sales Representative' : 'Sales Head'} as Changes Requested.`
    : `The opportunity stays in ${stage} and moves to On Hold.`;
}

function approvalStatus(o: OpportunityDetail, staged: boolean) {
  if (staged && o.stageId === 1 && o.subStageId === 2) return 'Changes requested by Sales Head. The opportunity remains Identified while the Sales Representative updates it.';
  if (staged && o.stageId === 1 && o.subStageId === 3) return 'On hold with Sales Head. The opportunity remains Identified.';
  if (staged && o.stageId === 2 && o.subStageId === 5) return 'Changes requested by CEO. The opportunity remains Qualifying (Go/No-Go) while the Sales Head updates it.';
  if (staged && o.stageId === 2 && o.subStageId === 6) return 'On hold with CEO. The opportunity remains Qualifying (Go/No-Go).';
  if (staged ? o.stageId === 1 && o.subStageId === 1 : o.state === 'SALES_REVIEW') return 'Pending Sales Head approval. Saving automatically places this opportunity in the Sales Head approval queue.';
  if (staged ? o.stageId === 2 && o.subStageId === 4 : o.state === 'GATE1_PENDING') return 'Sales Head approved this opportunity. It is automatically queued for CEO approval.';
  return 'No decision action is assigned to you for this revision. The recorded status and history remain available.';
}
export function ReviewActions({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [decision, setDecision] = useState<DecisionCommand['decision']>(), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [validation, setValidation] = useState<string>();
  const [holdReasonId, setHoldReasonId] = useState('');
  const holdReasonInputId = useId();
  const staged = o.stageId != null;
  const holding = staged && Boolean(decision?.endsWith('_HOLD'));
  const rejecting = staged && Boolean(decision && ['SALES_REJECT', 'GATE1_NO_GO', 'ESTIMATE_REJECT'].includes(decision));
  const requiresCode = holding || rejecting;
  const reasonLabel = holding ? 'Hold' : 'Rejection';
  const held = staged && (o.stageId === 1 && o.subStageId === 3 || o.stageId === 2 && o.subStageId === 6 || o.stageId === 4 && o.subStageId === 9);
  const loadReasons = useCallback(() => service.holdReasons ? service.holdReasons() : Promise.reject(new Error('Hold reasons are not available. Please retry.')), [service]);
  const holdReasons = useResource(loadReasons, requiresCode || (held || o.stageId === 9) && o.holdReasonCodeId != null);
  const selectedReason = holdReasons.data?.find(option => String(option.id) === holdReasonId);
  const persistedReason = holdReasons.data?.find(option => option.id === o.holdReasonCodeId);
  const salesReview = staged ? o.stageId === 1 : o.state === 'SALES_REVIEW';
  // The server checks the reviewer's role; the persisted stage limits the applicable review.
  const applicable = staged
    ? applicableDecisions(o) as DecisionCommand['decision'][]
    : LEGACY_DECISIONS.filter(action => action.startsWith('SALES_') ? o.state === 'SALES_REVIEW' : o.state === 'GATE1_PENDING');
  const decisions = applicable.filter(action => o.allowedActions.includes(action));
  const requiresReason = requiresCode || decision?.endsWith('REQUEST_CHANGES') || decision === 'SALES_REJECT' || decision === 'GATE1_NO_GO';

  async function decide() {
    if (!decision) return;
    const error = decisionError(o, decision, reason, staged || confirmed, selectedReason?.id);
    setValidation(error ?? undefined);
    if (error) return;
    const command = {
      opportunityId: o.id, expectedRevision: o.revision, packageRevision: o.packageRevision,
      ...(staged ? { expectedStageId: o.stageId, expectedSubStageId: o.subStageId } : {}),
      ...(requiresCode ? { reasonCodeId: selectedReason!.id } : {}),
      decision, reason: reason.trim(), confirmed: staged || confirmed,
    };
    await mutation.run(JSON.stringify(command), key => service.decide({ ...command, idempotencyKey: key }), value => {
      setDecision(undefined);
      onSaved(value);
    }, 'Decision recorded. Pipeline and history will use the updated opportunity.');
  }

  return <Panel title={decisions.includes('RESUBMIT') ? 'Changes requested' : decisions.length ? o.stageId != null && o.stageId >= 3 ? 'Opportunity actions' : salesReview ? 'Your sales approval is required' : 'Your Gate 1 decision is required' : 'Approval status'} tone="violet">
    {decisions.length > 0 ? <>
      <p className="mb-3 text-sm text-muted-foreground">
        {decisions.includes('RESUBMIT') ? 'Save the requested changes using Edit Opportunity, then resubmit them for review.' : staged && o.stageId! >= 3 ? 'Use the action for the current opportunity stage. Save your estimation before submitting it to CEO.' : <>{staged ? 'Review this opportunity before recording your decision. ' : `Review the saved opportunity revision ${o.packageRevision}. `}{salesReview ? 'Sales approval automatically sends this opportunity to CEO.' : 'Sales Head approved this opportunity. Record the Go / No-Go review decision.'}</>}
      </p>
      <div className="flex flex-wrap gap-3">{decisions.map(action => <Button key={action} type="button" variant={action === 'SALES_APPROVE' || action === 'GATE1_GO' ? 'default' : 'outline'} onClick={() => {
        setDecision(action); setReason(''); setHoldReasonId(''); setConfirmed(false); setValidation(undefined);
      }}>{LABELS[action]}</Button>)}</div>
    </> : <p className="text-sm text-muted-foreground">{approvalStatus(o, staged)}</p>}
    {staged && ([2, 3, 5, 6, 9].includes(o.subStageId ?? 0) || o.stageId === 9) && o.form.context.notes.trim() && <div className="mt-3 border-t pt-3 text-sm"><h4 className="font-semibold">{o.subStageId === 2 || o.subStageId === 5 ? 'Requested changes' : 'Decision note'}</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{o.form.context.notes}</p></div>}
    {(held || o.stageId === 9) && o.holdReasonCodeId != null && <p className="mt-2 text-sm text-muted-foreground">{held ? 'Hold reason' : 'Reason'}: {persistedReason?.name ?? `Reason code ${o.holdReasonCodeId}`}</p>}
    {!decision && validation && <Notice error={validation} />}
    {!decision && mutation.error && <Notice error={mutation.error} />}
    <Dialog open={Boolean(decision)} onOpenChange={open => { if (!open && !mutation.saving) setDecision(undefined); }}>
      <DialogContent className="opp-dialog">
        <DialogHeader>
          <DialogTitle>{decision ? LABELS[decision] : 'Review decision'}</DialogTitle>
          <DialogDescription>{o.number}{staged ? '. ' : ` · package revision ${o.packageRevision}. `}{decision && decisionDescription(o, decision, staged)}</DialogDescription>
        </DialogHeader>
        {requiresCode && <div className="space-y-1"><Label htmlFor={holdReasonInputId}>{reasonLabel} reason (required)</Label><select id={holdReasonInputId} value={holdReasonId} required disabled={mutation.saving || holdReasons.loading || Boolean(holdReasons.error)} onChange={event => setHoldReasonId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><option value="">{holdReasons.loading ? 'Loading hold reasons…' : 'Select a reason'}</option>{holdReasons.data?.map(option => <option key={option.id} value={String(option.id)}>{option.name}</option>)}</select>{selectedReason?.description && <p className="text-xs text-muted-foreground">{selectedReason.description}</p>}{holdReasons.error && <Notice error={holdReasons.error} retry={holdReasons.reload} />}{!holdReasons.loading && !holdReasons.error && holdReasons.data?.length === 0 && <p className="text-sm text-muted-foreground">No active reasons are available.</p>}</div>}
        <Field label={requiresCode ? `${reasonLabel} description (required)` : decision?.endsWith('REQUEST_CHANGES') ? 'Changes requested (required)' : requiresReason ? 'Reason (required)' : 'Decision note (optional)'} value={reason} onChange={setReason} multiline disabled={mutation.saving} required={Boolean(requiresReason)} />
        {!staged && <Label className="flex items-start gap-3 leading-relaxed">
          <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} disabled={mutation.saving} />
          {staged ? 'I have reviewed this opportunity.' : `I have reviewed this saved opportunity revision ${o.packageRevision}.`}
        </Label>}
        {validation && <Notice error={validation} />}
        {mutation.error && <Notice error={mutation.error} />}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.saving} onClick={() => setDecision(undefined)}>Cancel</Button>
          <Button type="button" disabled={mutation.saving} onClick={() => void decide()}>{mutation.saving ? 'Recording…' : 'Confirm decision'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Panel>;
}
