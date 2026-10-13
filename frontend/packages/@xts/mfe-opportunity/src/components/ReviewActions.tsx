import { useCallback, useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@xts/design-system';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { decisionError, isCeoDecisionStage, isSalesDecisionStage, requiresDecisionReason } from '../lib/workflow';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { useResource } from '../hooks/useResource';
import { Choice, Field, Notice, Panel } from './ui';

const LABELS = { SALES_APPROVE: 'Approve & Send to CEO', SALES_REJECT: 'Reject Opportunity', SALES_HOLD: 'Hold', GATE1_GO: 'Approve Go', GATE1_NO_GO: 'Decide No-Go', GATE1_HOLD: 'Hold' };
export function ReviewActions({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [decision, setDecision] = useState<DecisionCommand['decision']>(), [reason, setReason] = useState(''), [reasonCodeId, setReasonCodeId] = useState(''), [confirmed, setConfirmed] = useState(false), [validation, setValidation] = useState<string>();
  const loadReasons = useCallback(() => service.reasonCodes(), [service]);
  const reasons = useResource(loadReasons, Boolean(decision));
  const reasonRequired = Boolean(decision && requiresDecisionReason(decision));
  const selectedReason = reasons.data?.find(item => String(item.id) === reasonCodeId);
  const salesStage = isSalesDecisionStage(o), held = o.state === 'HOLD';
  const decisions = (Object.keys(LABELS) as DecisionCommand['decision'][]).filter(action => o.allowedActions.includes(action) && (action.startsWith('SALES_') ? salesStage : isCeoDecisionStage(o)) && !(held && action.endsWith('_HOLD')));
  async function decide() {
    if (!decision) return;
    const codeId = reasonCodeId ? Number(reasonCodeId) : null;
    const error = decisionError(o, decision, reason, confirmed, codeId);
    setValidation(error ?? undefined); if (error) return;
    if (reasonCodeId && (reasons.loading || reasons.error || !selectedReason)) { setValidation('The selected reason is unavailable. Reload Reason details and select an active reason.'); return; }
    await mutation.run(JSON.stringify({ decision, reason, reasonCodeId: codeId, revision: o.revision, packageRevision: o.packageRevision }), key => service.decide({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, packageRevision: o.packageRevision!, decision, reason: reason.trim(), reasonCodeId: codeId, confirmed }), value => { setDecision(undefined); onSaved(value); }, 'Decision recorded. Pipeline and history will use the updated opportunity.');
  }
  return <Panel title={decisions.length ? held ? 'Opportunity is on hold' : salesStage ? 'Your sales approval is required' : 'Your Gate 1 decision is required' : 'Approval status'} tone="violet">
    {decisions.length > 0 ? <>
      <p className="mb-3 text-sm text-muted-foreground">Review the saved opportunity revision {o.packageRevision}. {held ? `On hold at ${salesStage ? 'Sales Head' : 'CEO'} approval. Approve or reject when ready; the opportunity remains in your approval queue.` : salesStage ? 'Approve to send this opportunity to CEO, reject, or place it on hold.' : 'Sales Head approved this package. Record Go, No-Go, or place it on hold.'}</p>
      <div className="flex flex-wrap gap-3">{decisions.map(action => <Button key={action} type="button" variant={requiresDecisionReason(action) ? 'outline' : 'default'} onClick={() => { setDecision(action); setReason(''); setReasonCodeId(''); setConfirmed(false); setValidation(undefined); }}>{LABELS[action]}</Button>)}</div>
    </> : <p className="text-sm text-muted-foreground">{held ? `This opportunity is on hold at ${salesStage ? 'Sales Head' : 'CEO'} approval. It has not advanced to the next stage.` : o.state === 'SALES_REVIEW' ? 'Pending Sales Head approval. Saving automatically places this opportunity in the Sales Head approval queue.' : o.state === 'GATE1_PENDING' ? 'Sales Head approved this opportunity. It is automatically queued for CEO approval.' : 'No decision action is assigned to you for this revision. The recorded status and history remain available.'}</p>}
    {!decision && validation && <Notice error={validation} />}{!decision && mutation.error && <Notice error={mutation.error} />}
    <Dialog open={Boolean(decision)} onOpenChange={open => { if (!open && !mutation.saving) setDecision(undefined); }}>
      <DialogContent className="opp-dialog"><DialogHeader><DialogTitle>{decision ? LABELS[decision] : 'Review decision'}</DialogTitle><DialogDescription>{o.number} · package revision {o.packageRevision}. {decision?.endsWith('_HOLD') ? 'This moves the opportunity to Hold and keeps it assigned to the current approval stage.' : decision === 'SALES_APPROVE' ? 'This advances to Gate 1 pending for the assigned CEO / Approver.' : decision === 'GATE1_GO' ? 'This records final Gate 1 Go for the reviewed package.' : 'The opportunity is retained with its decision history and does not advance.'}</DialogDescription></DialogHeader>
        <Choice label="Reason details" value={reasonCodeId} options={[...(!reasonRequired ? [{ id: 'none', label: 'No reason selected' }] : []), ...(reasons.data ?? []).map(item => ({ id: String(item.id), label: item.reasonName }))]} onChange={value => setReasonCodeId(value === 'none' ? '' : value)} required={reasonRequired} disabled={mutation.saving || reasons.loading || Boolean(reasons.error)} />
        {reasons.loading && <p role="status" className="text-xs text-muted-foreground">Loading reason details...</p>}
        {reasons.error && <Notice title="Reason details unavailable" error={reasons.error} retry={reasons.reload} />}
        {!reasons.loading && !reasons.error && reasons.data?.length === 0 && <p role="status" className="text-sm text-muted-foreground">No active reasons are configured in Reason Code Master.</p>}
        {selectedReason?.description && <p className="text-sm text-muted-foreground">{selectedReason.description}</p>}
        <Field label="Decision note (optional)" value={reason} onChange={setReason} multiline disabled={mutation.saving} />
        <Label className="flex items-start gap-3 leading-relaxed"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} disabled={mutation.saving} />I have reviewed this saved opportunity revision {o.packageRevision}.</Label>
        {validation && <Notice error={validation} />}{mutation.error && <Notice error={mutation.error} />}
        <DialogFooter><Button type="button" variant="outline" disabled={mutation.saving} onClick={() => setDecision(undefined)}>Cancel</Button><Button type="button" disabled={mutation.saving || reasonRequired && (reasons.loading || Boolean(reasons.error) || reasons.data?.length === 0)} onClick={() => void decide()}>{mutation.saving ? 'Recording...' : 'Confirm decision'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </Panel>;
}
