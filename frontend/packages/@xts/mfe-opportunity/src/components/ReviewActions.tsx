import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Checkbox, cn, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@xts/design-system';
import { toast } from 'sonner';
import { estimationSubmissionError } from '../lib/estimationValidation';
import type { DecisionCommand, EstimationVersion, OpportunityDetail } from '@xts/api-contracts';
import { applicableDecisions, decisionError, money } from '../lib/workflow';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave, type ConfirmationTone } from '../hooks/useSave';
import { Field, Notice, Panel } from './ui';
import { useResource } from '../hooks/useResource';
import { ArrowRight, Calculator, Check, CircleHelp, Pause, Send, X } from 'lucide-react';

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
  ESTIMATE_REQUEST_CHANGES: 'Request Changes',
  ESTIMATE_REVISION_APPROVE: 'Approve estimation revision',
  ESTIMATE_REVISION_DECLINE: 'Decline revision request',
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
  SUBMIT_ESTIMATE: 'Submit', ESTIMATE_APPROVE: 'Approve', ESTIMATE_REQUEST_CHANGES: 'Changes', ESTIMATE_HOLD: 'Hold', ESTIMATE_REJECT: 'Reject',
  BID_SUBMITTED: 'Submitted', START_NEGOTIATION: 'Negotiate', MARK_WON: 'Won', MARK_LOST: 'Lost',
  OPPORTUNITY_HOLD: 'Hold', RESUME_NEGOTIATION: 'Resume', RESUME_PROPOSAL: 'Resume', CLOSE_OPPORTUNITY: 'Close', RESUBMIT: 'Resubmit',
};
const LEGACY_DECISIONS: DecisionCommand['decision'][] = ['SALES_APPROVE', 'SALES_REJECT', 'GATE1_GO', 'GATE1_NO_GO'];
const NEGATIVE_DECISIONS: DecisionCommand['decision'][] = ['SALES_REJECT', 'GATE1_NO_GO', 'ESTIMATE_REVISION_DECLINE', 'MARK_LOST'];
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
    ESTIMATE_REQUEST_CHANGES: 'This returns the opportunity to the Estimation Team at Solution/Scoping Estimation.',
    SUBMIT_ESTIMATE: 'Send this estimate to the CEO for review.',
    ESTIMATE_APPROVE: 'Approval moves this opportunity to Proposal / Bid Submission · Proposal In Preparation.',
    ESTIMATE_REVISION_APPROVE: 'This approves the revision request and returns the opportunity to Engineering Estimation · In Progress. The revised estimate will follow the normal CEO approval and proposal cycle.',
    ESTIMATE_REVISION_DECLINE: 'This declines the revision request and returns the opportunity to Under Negotiation. The Sales Head can continue with the existing estimate or record Won or Lost.',
    BID_SUBMITTED: 'This records the proposal / bid as submitted to the client.',
    START_NEGOTIATION: 'This moves the opportunity to Negotiation.',
    MARK_WON: 'This closes the opportunity as Closed — Won.',
    MARK_LOST: 'This closes the opportunity as Closed — Lost.',
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

export function ReviewActions({ opportunity: o, onSaved, variant = 'panel', getEstimation, selectedVersion, hasUnsavedChanges = false, estimationName }: { selectedVersion?: EstimationVersion | null; getEstimation?: () => OpportunityDetail['estimation'] | undefined; hasUnsavedChanges?: boolean; estimationName?: string; opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; variant?: 'panel' | 'bare' | 'card' | 'toolbar' }) {
  const service = useOpportunityService(), mutation = useSave();
  const [decision, setDecision] = useState<DecisionCommand['decision']>(), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [validation, setValidation] = useState<string>();
  const [holdReasonId, setHoldReasonId] = useState('');
  const [submitNeedsUpdate, setSubmitNeedsUpdate] = useState(false);
  const [negotiationReasonId, setNegotiationReasonId] = useState('');
  const [negotiationAttempted, setNegotiationAttempted] = useState(false);
  const [negotiationConfirmation, setNegotiationConfirmation] = useState(false);
  const negotiationReasonRef = useRef<HTMLButtonElement>(null);
  const [requiresRevisedEstimation, setRequiresRevisedEstimation] = useState(false);
  const [completed, setCompleted] = useState<{ id: string; sourceStageId: OpportunityDetail['stageId']; sourceState: OpportunityDetail['state']; stageId: OpportunityDetail['stageId']; subStageId: OpportunityDetail['subStageId']; decision: DecisionCommand['decision'] }>();
  useEffect(() => {
    setNegotiationAttempted(false); setNegotiationConfirmation(false);
    setDecision(undefined); setReason(''); setHoldReasonId(''); setNegotiationReasonId(''); setRequiresRevisedEstimation(false); setConfirmed(false); setValidation(undefined);
    setSubmitNeedsUpdate(false);
  }, [o.id, o.stageId, o.subStageId]);
  useEffect(() => {
    if (!hasUnsavedChanges) setSubmitNeedsUpdate(false);
  }, [hasUnsavedChanges]);
  const holdReasonInputId = useId();
  const negotiationReasonInputId = useId(), negotiationDescriptionId = useId();
  const negotiationNoteId = useId();
  const revisedEstimationInputId = useId();
  const negotiating = decision === 'START_NEGOTIATION';
  const revisionApprovalPending = o.stageId === 4 && o.subStageId === 5;
  const loadNegotiationReasons = useCallback(() => service.negotiationReasons ? service.negotiationReasons() : Promise.reject(new Error('Negotiation reasons are not available. Please retry.')), [service]);
  const negotiationReasons = useResource(loadNegotiationReasons, negotiating || revisionApprovalPending);
  const negotiationReason = negotiationReasons.data?.find(option => String(option.id) === negotiationReasonId);
  const missingNegotiationReason = negotiationAttempted && !negotiationReason;
  const revisionRequestReason = negotiationReasons.data?.find(option => option.id === o.holdReasonCodeId);
  const revisionRequest = [...(o.stageHistory ?? [])].reverse().find(event => event.stageId === 4 && event.subStageId === 5);
  const staged = o.stageId != null;
  const holding = staged && Boolean(decision?.endsWith('_HOLD'));
  const rejecting = staged && Boolean(decision && ['SALES_REJECT', 'GATE1_NO_GO'].includes(decision));
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
  const requiresDescription = decision?.endsWith('REQUEST_CHANGES') === true;
  const reasonCodeMissing = requiresCode && validation === `Select a ${reasonLabel.toLowerCase()} reason.`;
  const descriptionMissing = requiresDescription && validation === 'Enter the changes requested before returning the opportunity.';
  const requiredFieldMissing = reasonCodeMissing || descriptionMissing;
  const matchingCompletion = completed?.id === o.id && completed.stageId === o.stageId && completed.subStageId === o.subStageId &&
    (staged ? completed.sourceStageId === o.stageId : completed.sourceState === o.state) ? completed : undefined;
  const keepSelectedReview = o.stageId == null || o.stageId < 3 || o.stageId === 4 && o.subStageId === 9;
  const selectedDecision = keepSelectedReview ? matchingCompletion?.decision ?? persistedDecision(o) : undefined;
  // A saved workflow status must never create controls for a user without action permissions.
  const completedChoices = selectedDecision && decisions.length > 0 ? [selectedDecision] : [];
  const displayedDecisions = [...new Set([...completedChoices, ...decisions])].filter(action => action !== 'GATE1_REQUEST_CHANGES');

  async function decide() {
    if (!decision) return;
    if (decision === 'SUBMIT_ESTIMATE' && hasUnsavedChanges) {
      setDecision(undefined);
      setSubmitNeedsUpdate(true);
      return;
    }
    const error = decision === 'SUBMIT_ESTIMATE' && !selectedVersion ? 'Select a saved estimation before submitting to CEO.' : decisionError(o, decision, reason, staged || confirmed, selectedReason?.id);
    setValidation(error ?? undefined);
    if (error) return;
    if (decision === 'ESTIMATE_APPROVE') {
      try { getEstimation?.(); }
      catch (error) { setValidation(error instanceof Error ? error.message : 'Save the opportunity rates before approving.'); return; }
    }
    if (negotiating) {
      setNegotiationAttempted(true);
      if (!negotiationReason) { negotiationReasonRef.current?.focus(); return; }
      if (!negotiationConfirmation) { setNegotiationConfirmation(true); return; }
    }
    const note = reason.trim();
    const command = {
      opportunityId: o.id, expectedRevision: o.revision, packageRevision: o.packageRevision,
      ...(staged ? { expectedStageId: o.stageId, expectedSubStageId: o.subStageId } : {}),
      ...(requiresCode ? { reasonCodeId: selectedReason!.id } : {}),
      ...(negotiating ? { reasonCodeId: negotiationReason!.id, requiresRevisedEstimation } : {}),
      decision, reason: note, confirmed: staged || confirmed,
    };
    await mutation.run(JSON.stringify(command), key => service.decide({ ...command, ...(decision === 'SUBMIT_ESTIMATE' ? { estimationVersionId: selectedVersion!.id } : {}), idempotencyKey: key }), value => {
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
  const isPrimary = (action: DecisionCommand['decision']) => ['SALES_APPROVE', 'GATE1_GO', 'SUBMIT_ESTIMATE', 'ESTIMATE_APPROVE', 'ESTIMATE_REVISION_APPROVE', 'BID_SUBMITTED', 'START_NEGOTIATION', 'RESUME_NEGOTIATION', 'RESUME_PROPOSAL', 'MARK_WON'].includes(action);
  const primary = decisions.find(isPrimary) ?? displayedDecisions.find(isPrimary);
  const secondary = displayedDecisions.filter(action => action !== primary);
  const actionTone = (action: DecisionCommand['decision']): ConfirmationTone => action.endsWith('_REQUEST_CHANGES') ? 'info' : confirmationTone(action);
  const buttonTone = (action: DecisionCommand['decision']) => `opp-review-${actionTone(action)}`;
  const actionButton = (action: DecisionCommand['decision'], compact = false) => {
    const selected = action === selectedDecision;
    const Icon = selected ? Check : TONE_ICON[actionTone(action)];
    return <Button key={action} type="button" size="sm" variant="outline"
      aria-pressed={selected} title={selected ? 'Action completed' : action === 'SUBMIT_ESTIMATE' && !selectedVersion ? 'Select a saved estimation first' : undefined}
      className={`${buttonTone(action)}${action === primary ? ' opp-review-primary' : ''}${selected ? ` ${CONFIRMATION_STYLES[confirmationTone(action)]} border shadow-inner ring-2 ring-inset ring-current disabled:opacity-100` : ''}`}
      disabled={mutation.saving || selected || !decisions.includes(action) || action === 'SUBMIT_ESTIMATE' && !selectedVersion} onClick={() => {
        if (action === 'SUBMIT_ESTIMATE') {
          if (hasUnsavedChanges) { setSubmitNeedsUpdate(true); return; }
          try {
            const error = estimationSubmissionError(selectedVersion?.estimation);
            if (error) { toast.error(error, { id: `estimate-validation-${o.id}`, duration: 6000 }); return; }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Check the estimate before submitting.', { id: `estimate-validation-${o.id}`, duration: 6000 });
            return;
          }
          toast.dismiss(`estimate-validation-${o.id}`);
        }
        setNegotiationAttempted(false); setNegotiationConfirmation(false);
        setDecision(action); setReason(''); setHoldReasonId(''); setNegotiationReasonId(''); setRequiresRevisedEstimation(false); setConfirmed(false); setValidation(undefined);
      }}><Icon className="opp-review-button-icon" aria-hidden="true" /><span className="opp-review-button-label">{compact ? COMPACT_LABELS[action] ?? LABELS[action] : LABELS[action]}</span></Button>;
  };
  return <section className="opp-review-actions" aria-label="Opportunity actions">
    {revisionApprovalPending && <div className="opp-review-notice" role="status"><Send className="opp-review-button-icon" aria-hidden="true" /><div><strong>Estimation revision approval pending</strong><span>Awaiting the CEO's decision on the Sales Head's revision request.</span></div></div>}
    {submitNeedsUpdate && <p role="status" className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900">Update <strong className="break-words">{estimationName?.trim() || 'this estimation'}</strong> to save your latest changes before submitting it to the CEO.</p>}
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
    <Dialog open={Boolean(decision)} onOpenChange={open => { if (!open && !mutation.saving) { setDecision(undefined); setValidation(undefined); } }}>
      <DialogContent className={cn('opp-dialog', decision === 'SUBMIT_ESTIMATE' && 'w-[calc(100vw-2rem)] !gap-3 !p-4 sm:max-w-md', negotiating && 'w-[calc(100vw-2rem)] !gap-4 !p-5 sm:max-w-md')}>
        <DialogHeader>
          <DialogTitle>{decision ? LABELS[decision] : 'Review decision'}</DialogTitle>
          <DialogDescription>
            {decision && <><span className="rounded bg-primary/10 px-1 py-0.5 font-semibold text-primary">{o.number}</span>{`. ${decisionDescription(o, decision, staged)}`}</>}
          </DialogDescription>
        </DialogHeader>
        {revisionApprovalPending && (revisionRequestReason || revisionRequest?.comment) && <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {revisionRequestReason && <p className="font-medium">{revisionRequestReason.name}</p>}
          {revisionRequest?.comment && <p className="whitespace-pre-wrap break-words text-muted-foreground">{revisionRequest.comment}</p>}
        </div>}
        {negotiating && <div className="space-y-1.5">
          <Label htmlFor={negotiationReasonInputId}>Negotiation reason <span className="text-destructive" aria-hidden="true">*</span></Label>
          <Select value={negotiationReasonId} onValueChange={value => { setNegotiationReasonId(value); setNegotiationConfirmation(false); }} disabled={mutation.saving || negotiationReasons.loading || Boolean(negotiationReasons.error)}>
            <SelectTrigger ref={negotiationReasonRef} id={negotiationReasonInputId} aria-label="Negotiation reason" aria-required="true"
              aria-invalid={missingNegotiationReason}
              aria-describedby={missingNegotiationReason ? `${negotiationReasonInputId}-hint` : negotiationReason?.description ? negotiationDescriptionId : undefined}
              className="opp-negotiation-input w-full">
              <SelectValue placeholder={negotiationReasons.loading ? 'Loading negotiation reasons…' : 'Select a negotiation reason'} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[min(16rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]">
              {negotiationReasons.data?.map(option => <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {missingNegotiationReason && <p id={`${negotiationReasonInputId}-hint`} role="status" className="text-xs text-muted-foreground">Please choose the reason for this negotiation to continue.</p>}
          {negotiationReason?.description && <p id={negotiationDescriptionId} className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{negotiationReason.description}</p>}
          {negotiationReasons.error && <Notice error={negotiationReasons.error} retry={negotiationReasons.reload} />}
          {!negotiationReasons.loading && !negotiationReasons.error && negotiationReasons.data?.length === 0 && <p className="text-sm text-muted-foreground">No active negotiation reasons are available.</p>}
        </div>}
        {negotiating && <label htmlFor={revisedEstimationInputId} className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
          requiresRevisedEstimation ? 'border-primary/50 bg-primary/[0.055] shadow-sm ring-1 ring-primary/15' : 'border-border bg-card shadow-sm hover:border-primary/35 hover:bg-muted/20',
          mutation.saving && 'cursor-not-allowed opacity-60',
        )}>
          <Checkbox id={revisedEstimationInputId} checked={requiresRevisedEstimation}
            onCheckedChange={checked => { setRequiresRevisedEstimation(checked === true); setNegotiationConfirmation(false); }} disabled={mutation.saving}
            className="shrink-0" />
          <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', requiresRevisedEstimation ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')} aria-hidden="true"><Calculator size={17} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">Requires revised estimation</span>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', requiresRevisedEstimation ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{requiresRevisedEstimation ? 'Yes' : 'No'}</span>
        </label>}
        {decision === 'SUBMIT_ESTIMATE' && selectedVersion && <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 px-3 py-2" aria-label="Estimate value">
          <span className="text-xs font-medium text-muted-foreground">Estimate value</span>
          <strong className="rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary">{money(selectedVersion.estimation.total, selectedVersion.currencyCode)}</strong>
        </div>}
        {requiresCode && <div className="space-y-1"><Label htmlFor={holdReasonInputId}>{reasonLabel} reason <span className="text-destructive" aria-hidden="true">*</span></Label><select id={holdReasonInputId} value={holdReasonId} required aria-required="true" aria-invalid={reasonCodeMissing} disabled={mutation.saving || holdReasons.loading || Boolean(holdReasons.error)} onChange={event => { setHoldReasonId(event.target.value); setValidation(undefined); }} className={cn('h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring', reasonCodeMissing ? '!border-destructive !text-destructive focus-visible:!outline-destructive' : 'border-input')}><option value="">{holdReasons.loading ? 'Loading hold reasons…' : reasonCodeMissing ? `Choose a ${reasonLabel.toLowerCase()} reason to continue.` : 'Select a reason'}</option>{holdReasons.data?.map(option => <option key={option.id} value={String(option.id)} className="text-foreground">{option.name}</option>)}</select>{selectedReason?.description && <p className="text-xs text-muted-foreground">{selectedReason.description}</p>}{holdReasons.error && <Notice error={holdReasons.error} retry={holdReasons.reload} />}{!holdReasons.loading && !holdReasons.error && holdReasons.data?.length === 0 && <p className="text-sm text-muted-foreground">No active reasons are available.</p>}</div>}
        {negotiating ? <div className="space-y-1">
          <Label htmlFor={negotiationNoteId}>Negotiation description</Label>
          <Textarea id={negotiationNoteId} value={reason} onChange={event => setReason(event.target.value)} disabled={mutation.saving}
            placeholder="Briefly describe what is being negotiated." />
        </div> : decision !== 'RESUBMIT' && <Field label={holding ? 'Hold description' : rejecting ? 'Rejection description' : requiresCode ? `${reasonLabel} description` : decision?.endsWith('REQUEST_CHANGES') ? 'Changes requested' : requiresDescription ? 'Reason' : 'Decision note'} value={reason} onChange={value => { setReason(value); if (descriptionMissing) setValidation(undefined); }} multiline disabled={mutation.saving} required={Boolean(requiresDescription)} invalid={descriptionMissing} placeholder={decision?.endsWith('REQUEST_CHANGES') ? 'Please describe the requested changes.' : rejecting ? 'Add a brief rejection note.' : undefined} />}
        {!staged && <Label className="flex items-start gap-3 leading-relaxed">
          <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} disabled={mutation.saving} />
          I have reviewed this opportunity.
        </Label>}
        {validation && !requiredFieldMissing && <Notice error={validation} />}
        {mutation.error && <Notice error={mutation.error} />}
        {negotiating && negotiationConfirmation && <div role="status" className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.045] px-3 py-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true"><CircleHelp size={15} /></span>
          <p className="text-sm font-semibold text-foreground">{requiresRevisedEstimation ? 'Send this estimate back for revision?' : 'Proceed without a revised estimate?'}</p>
        </div>}
        <DialogFooter className={decision === 'SUBMIT_ESTIMATE' ? 'border-t pt-4' : undefined}>
          <Button type="button" variant="outline" disabled={mutation.saving} onClick={() => { if (negotiationConfirmation) setNegotiationConfirmation(false); else { setDecision(undefined); setValidation(undefined); } }}>{negotiationConfirmation ? 'Back' : 'Cancel'}</Button>
          <Button type="button" variant="outline" className={decision ? buttonTone(decision) : undefined} disabled={mutation.saving} onClick={() => void decide()}>{mutation.saving ? 'Recording…' : negotiating && negotiationConfirmation ? 'Confirm' : 'Confirm decision'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
