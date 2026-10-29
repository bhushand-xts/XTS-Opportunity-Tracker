import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, cn, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@xts/design-system';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { applicableDecisions, decisionError } from '../lib/workflow';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave, type ConfirmationTone } from '../hooks/useSave';
import { Field, Notice, Panel } from './ui';
import { useCallback, useId } from 'react';
import { useResource } from '../hooks/useResource';
import { ArrowRight, Check, Pause, Send, X } from 'lucide-react';

const TONE_ICON: Record<ConfirmationTone, typeof Check> = { success: Check, warning: Pause, error: X, info: ArrowRight };

const LABELS: Record<DecisionCommand['decision'], string> = {
  SALES_APPROVE: 'Approve & Send to CEO',
  SALES_REQUEST_CHANGES: 'Request Changes',
  SALES_HOLD: 'On Hold',
  SALES_REJECT: 'Reject Opportunity',
  GATE1_GO: 'Approve Go',
  GATE1_REQUEST_CHANGES: 'Request Changes',
  GATE1_HOLD: 'On Hold',
  GATE1_NO_GO: 'Reject Opportunity',
  SUBMIT_ESTIMATE: 'Submit Estimation to CEO',
  ESTIMATE_APPROVE: 'Approve Estimation',
  ESTIMATE_HOLD: 'Hold Estimation',
  ESTIMATE_REJECT: 'Reject Estimation',
  BID_SUBMITTED: 'Proposal / Bid Submitted',
  START_NEGOTIATION: 'Under Negotiation',
  MARK_WON: 'Won',
  MARK_LOST: 'Lost',
  OPPORTUNITY_HOLD: 'On Hold',
  RESUME_NEGOTIATION: 'Resume Negotiation',
  RESUME_PROPOSAL: 'Resume Proposal Follow-up',
  CLOSE_OPPORTUNITY: 'Close Opportunity',
  RESUBMIT: 'Resubmit for Review',
};
// Short labels for the "card" variant — a ~260px header card has no room for "Approve Estimation" /
// "Hold Estimation" without wrapping onto a second line and looking crowded; the full LABELS text
// still appears everywhere else (dialog title, Panel/bare variants).
const COMPACT_LABELS: Partial<Record<DecisionCommand['decision'], string>> = {
  SALES_APPROVE: 'Approve', SALES_REQUEST_CHANGES: 'Changes', SALES_HOLD: 'Hold', SALES_REJECT: 'Reject',
  GATE1_GO: 'Approve', GATE1_REQUEST_CHANGES: 'Changes', GATE1_HOLD: 'Hold', GATE1_NO_GO: 'Reject',
  SUBMIT_ESTIMATE: 'Submit', ESTIMATE_APPROVE: 'Approve', ESTIMATE_HOLD: 'Hold', ESTIMATE_REJECT: 'Reject',
  BID_SUBMITTED: 'Submitted', START_NEGOTIATION: 'Negotiate', MARK_WON: 'Won', MARK_LOST: 'Lost',
  OPPORTUNITY_HOLD: 'Hold', RESUME_NEGOTIATION: 'Resume', RESUME_PROPOSAL: 'Resume', CLOSE_OPPORTUNITY: 'Close', RESUBMIT: 'Resubmit',
};
const LEGACY_DECISIONS: DecisionCommand['decision'][] = ['SALES_APPROVE', 'SALES_REJECT', 'GATE1_GO', 'GATE1_NO_GO'];
const NEGATIVE_DECISIONS: DecisionCommand['decision'][] = ['SALES_REJECT', 'GATE1_NO_GO', 'ESTIMATE_REJECT', 'MARK_LOST'];
const CONFIRMATION_STYLES: Record<ConfirmationTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-primary/30 bg-accent text-accent-foreground',
};
function confirmationTone(decision: DecisionCommand['decision']): ConfirmationTone {
  if (NEGATIVE_DECISIONS.includes(decision)) return 'error';
  if (decision.endsWith('_HOLD') || decision.endsWith('_REQUEST_CHANGES')) return 'warning';
  return 'success';
}
function persistedDecision(o: OpportunityDetail): DecisionCommand['decision'] | undefined {
  if (o.stageId == null) return undefined;
  // Keep the selected look only while the action's own workflow stage is current.
  const decisions: Record<string, DecisionCommand['decision']> = {
    '1/3': 'SALES_HOLD',
    '2/5': 'GATE1_REQUEST_CHANGES', '2/6': 'GATE1_HOLD',
    '4/9': 'ESTIMATE_HOLD', '5/11': 'BID_SUBMITTED',
  };
  return decisions[`${o.stageId}/${o.subStageId}`];
}

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
    SUBMIT_ESTIMATE: 'This sends the estimation to CEO review and records your decision note. An estimation matrix is optional.',
    ESTIMATE_APPROVE: 'Approval moves this opportunity to Proposal / Bid Submission · Proposal In Preparation.',
    BID_SUBMITTED: 'This records the proposal / bid as submitted to the client.',
    START_NEGOTIATION: 'This moves the opportunity to Negotiation · Under Negotiation.',
    MARK_WON: 'This closes the opportunity as Closed — Won · Won.',
    MARK_LOST: 'This closes the opportunity as Closed — Lost · Lost.',
    OPPORTUNITY_HOLD: 'This records On Hold as the opportunity outcome. The Sales Head can resume the client follow-up when ready.',
    RESUME_NEGOTIATION: 'This resumes the opportunity at Negotiation · Under Negotiation.',
    RESUME_PROPOSAL: 'This returns the opportunity to Proposal / Bid Submission for client follow-up.',
    CLOSE_OPPORTUNITY: 'This closes the opportunity as No-Bid / Declined · Closed by Sales.',
  };
  if (descriptions[decision]) return descriptions[decision];
  const stage = o.stageId === 1 ? 'Identified' : o.stageId === 4 ? 'Estimate Review & Approval' : 'Qualifying (Go/No-Go)';
  return decision.endsWith('REQUEST_CHANGES')
    ? `The opportunity stays in ${stage} and returns to the ${o.stageId === 1 ? 'opportunity creator or Sales Head' : 'Sales Head'} as Changes Requested.`
    : `The opportunity stays in ${stage} and moves to On Hold.`;
}

export function ReviewActions({ opportunity: o, onSaved, variant = 'panel' }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; variant?: 'panel' | 'bare' | 'card' | 'toolbar' }) {
  const service = useOpportunityService(), mutation = useSave();
  const [decision, setDecision] = useState<DecisionCommand['decision']>(), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [validation, setValidation] = useState<string>();
  const [holdReasonId, setHoldReasonId] = useState('');
  const [completed, setCompleted] = useState<{ id: string; sourceStageId: OpportunityDetail['stageId']; sourceState: OpportunityDetail['state']; stageId: OpportunityDetail['stageId']; subStageId: OpportunityDetail['subStageId']; decision: DecisionCommand['decision'] }>();
  useEffect(() => {
    setDecision(undefined); setReason(''); setHoldReasonId(''); setConfirmed(false); setValidation(undefined);
  }, [o.id, o.stageId, o.subStageId]);
  const holdReasonInputId = useId();
  const staged = o.stageId != null;
  const holding = staged && Boolean(decision?.endsWith('_HOLD'));
  const rejecting = staged && Boolean(decision && ['SALES_REJECT', 'GATE1_NO_GO', 'ESTIMATE_REJECT'].includes(decision));
  const requiresCode = holding || rejecting;
  const reasonLabel = holding ? 'Hold' : 'Rejection';
  const loadReasons = useCallback(() => service.holdReasons ? service.holdReasons() : Promise.reject(new Error('Hold reasons are not available. Please retry.')), [service]);
  const holdReasons = useResource(loadReasons, requiresCode);
  const selectedReason = holdReasons.data?.find(option => String(option.id) === holdReasonId);
  // The server checks the reviewer's role; the persisted stage limits the applicable review.
  const applicable = staged
    ? applicableDecisions(o) as DecisionCommand['decision'][]
    : LEGACY_DECISIONS.filter(action => action.startsWith('SALES_') ? o.state === 'SALES_REVIEW' : o.state === 'GATE1_PENDING');
  const decisions = applicable.filter(action => action !== 'CLOSE_OPPORTUNITY' && action !== 'RESUBMIT' && o.allowedActions.includes(action));
  const requiresReason = requiresCode || decision?.endsWith('REQUEST_CHANGES') || decision === 'SALES_REJECT' || decision === 'GATE1_NO_GO';
  const matchingCompletion = completed?.id === o.id && completed.stageId === o.stageId && completed.subStageId === o.subStageId &&
    (staged ? completed.sourceStageId === o.stageId : completed.sourceState === o.state) ? completed : undefined;
  const keepSelectedReview = o.stageId == null || o.stageId < 3 || o.stageId === 4 && o.subStageId === 9;
  const selectedDecision = keepSelectedReview ? matchingCompletion?.decision ?? persistedDecision(o) : undefined;
  // A saved workflow status must never create controls for a user without action permissions.
  const completedChoices = selectedDecision && decisions.length > 0 ? [selectedDecision] : [];
  const displayedDecisions = [...new Set([...completedChoices, ...decisions])].filter(action => action !== 'GATE1_REQUEST_CHANGES');

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
      setCompleted({ id: value.id, sourceStageId: o.stageId, sourceState: o.state, stageId: value.stageId, subStageId: value.subStageId, decision: command.decision });
      onSaved(value);
    }, null);
  }

  if (o.stageId === 1 && o.subStageId === 2) return <div className="opp-review-actions opp-review-notice" role="status">
    <Send className="opp-review-button-icon" aria-hidden="true" />
    <div><strong>Change request sent</strong><span>Waiting for the opportunity creator or Sales Head to update the opportunity.</span></div>
  </div>;
  if (!displayedDecisions.length) return null;
  const isPrimary = (action: DecisionCommand['decision']) => ['SALES_APPROVE', 'GATE1_GO', 'SUBMIT_ESTIMATE', 'ESTIMATE_APPROVE', 'BID_SUBMITTED', 'START_NEGOTIATION', 'RESUME_NEGOTIATION', 'RESUME_PROPOSAL', 'MARK_WON'].includes(action);
  const primary = decisions.find(isPrimary) ?? displayedDecisions.find(isPrimary);
  const secondary = displayedDecisions.filter(action => action !== primary);
  const actionTone = (action: DecisionCommand['decision']): ConfirmationTone => action.endsWith('_REQUEST_CHANGES') ? 'info' : confirmationTone(action);
  const buttonTone = (action: DecisionCommand['decision']) => `opp-review-${actionTone(action)}`;
  const actionButton = (action: DecisionCommand['decision'], compact = false) => {
    const selected = action === selectedDecision;
    const Icon = selected ? Check : TONE_ICON[actionTone(action)];
    return <Button key={action} type="button" size="sm" variant="outline"
      aria-pressed={selected} title={selected ? 'Action completed' : undefined}
      className={`${buttonTone(action)}${action === primary ? ' opp-review-primary' : ''}${selected ? ` ${CONFIRMATION_STYLES[confirmationTone(action)]} border shadow-inner ring-2 ring-inset ring-current disabled:opacity-100` : ''}`}
      disabled={mutation.saving || selected || !decisions.includes(action)} onClick={() => {
        setDecision(action); setReason(''); setHoldReasonId(''); setConfirmed(false); setValidation(undefined);
      }}><Icon className="opp-review-button-icon" aria-hidden="true" /><span className="opp-review-button-label">{compact ? COMPACT_LABELS[action] ?? LABELS[action] : LABELS[action]}</span></Button>;
  };
  return <section className="opp-review-actions" aria-label="Opportunity actions">
    {displayedDecisions.length > 0 && (variant === 'toolbar'
      ? <div className="opp-review-buttons opp-review-buttons-toolbar">{displayedDecisions.map(action => actionButton(action))}</div>
      : variant === 'bare'
      ? <div className="opp-review-buttons opp-review-buttons-bare">{displayedDecisions.map(action => actionButton(action))}</div>
      : variant === 'card'
      ? <Card className="min-w-0 border-t-[3px] border-t-primary bg-gradient-to-br from-card from-50% to-primary/5 shadow-sm">
          <section className="flex h-full flex-col justify-center gap-2 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Opportunity actions</span>
            <div className={cn('opp-review-buttons opp-review-buttons-bare', 'opp-review-buttons-card')}>{displayedDecisions.map(action => actionButton(action, true))}</div>
          </section>
        </Card>
      : <Panel title="Opportunity actions" description="Review this opportunity and choose the next step." tone="indigo" icon={Check} accentIcon className="opp-review-panel">
          <div className="opp-review-buttons">{primary && actionButton(primary)}{secondary.length > 0 && <div className="opp-review-secondary">{secondary.map(action => actionButton(action))}</div>}</div>
        </Panel>)}
    {!decision && validation && <Notice error={validation} />}
    {!decision && mutation.error && <Notice error={mutation.error} />}
    <Dialog open={Boolean(decision)} onOpenChange={open => { if (!open && !mutation.saving) setDecision(undefined); }}>
      <DialogContent className="opp-dialog">
        <DialogHeader>
          <DialogTitle>{decision ? LABELS[decision] : 'Review decision'}</DialogTitle>
          <DialogDescription>{o.number}{staged ? '. ' : ` · package revision ${o.packageRevision}. `}{decision && decisionDescription(o, decision, staged)}</DialogDescription>
        </DialogHeader>
        {requiresCode && <div className="space-y-1"><Label htmlFor={holdReasonInputId}>{reasonLabel} reason (required)</Label><select id={holdReasonInputId} value={holdReasonId} required disabled={mutation.saving || holdReasons.loading || Boolean(holdReasons.error)} onChange={event => setHoldReasonId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><option value="">{holdReasons.loading ? 'Loading hold reasons…' : 'Select a reason'}</option>{holdReasons.data?.map(option => <option key={option.id} value={String(option.id)}>{option.name}</option>)}</select>{selectedReason?.description && <p className="text-xs text-muted-foreground">{selectedReason.description}</p>}{holdReasons.error && <Notice error={holdReasons.error} retry={holdReasons.reload} />}{!holdReasons.loading && !holdReasons.error && holdReasons.data?.length === 0 && <p className="text-sm text-muted-foreground">No active reasons are available.</p>}</div>}
        {decision !== 'RESUBMIT' && <Field label={requiresCode ? `${reasonLabel} description (required)` : decision?.endsWith('REQUEST_CHANGES') ? 'Changes requested (required)' : requiresReason ? 'Reason (required)' : 'Decision note (optional)'} value={reason} onChange={setReason} multiline disabled={mutation.saving} required={Boolean(requiresReason)} />}
        {!staged && <Label className="flex items-start gap-3 leading-relaxed">
          <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} disabled={mutation.saving} />
          {staged ? 'I have reviewed this opportunity.' : `I have reviewed this saved opportunity revision ${o.packageRevision}.`}
        </Label>}
        {validation && <Notice error={validation} />}
        {mutation.error && <Notice error={mutation.error} />}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.saving} onClick={() => setDecision(undefined)}>Cancel</Button>
          <Button type="button" variant="outline" className={decision ? buttonTone(decision) : undefined} disabled={mutation.saving} onClick={() => void decide()}>{mutation.saving ? 'Recording…' : 'Confirm decision'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
