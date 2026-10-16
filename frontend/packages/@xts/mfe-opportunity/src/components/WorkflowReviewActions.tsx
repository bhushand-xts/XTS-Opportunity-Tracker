import { useId, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HOLD_REASONS } from '../services/opportunity.queries';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@xts/design-system';
import type { OpportunityDetail } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { stageStatus } from '../lib/opportunityStages';
import { Field, Notice, Panel } from './ui';

const choices = [
  { action: 'APPROVE', permission: 'WORKFLOW_APPROVE', label: 'Approve' },
  { action: 'REQUEST_CHANGES', permission: 'WORKFLOW_REQUEST_CHANGES', label: 'Request changes' },
  { action: 'HOLD', permission: 'WORKFLOW_HOLD', label: 'On hold' },
] as const;

export function WorkflowReviewActions({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [selected, setSelected] = useState<typeof choices[number]>(), [comment, setComment] = useState(''), [error, setError] = useState<string>();
  const [reasonId, setReasonId] = useState('');
  const holdReasonId = useId();
  const holding = selected?.action === 'HOLD' && o.stageId === 1;
  const reasons = useQuery<{ reasonCodesList: ({ id: number; reasonName: string; isActive: boolean; displayOrder: number | null } | null)[] }>(GET_HOLD_REASONS, { skip: !holding, fetchPolicy: 'network-only' });
  const activeReasons = (reasons.data?.reasonCodesList ?? []).filter((reason): reason is NonNullable<typeof reason> => reason?.isActive === true).sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.id - b.id);
  const permitted = choices.filter(choice => o.allowedActions.includes(choice.permission));
  async function confirm() {
    if (!selected || !service.transition) return;
    if (holding && !activeReasons.some(reason => String(reason.id) === reasonId)) { setError('Select a reason code before placing the opportunity on hold.'); return; }
    if (selected.action === 'REQUEST_CHANGES' && !comment.trim()) { setError('Describe the changes required.'); return; }
    await mutation.run(JSON.stringify({ id: o.id, stage: o.stageId, substage: o.subStageId, action: selected.action, comment, reasonId }), () => holding ? service.transition!(o.id, selected.action, '', Number(reasonId)) : service.transition!(o.id, selected.action, comment), updated => { setSelected(undefined); onSaved(updated); }, 'Decision recorded.');
  }
  return <Panel title={permitted.length ? o.stageId === 1 ? 'Sales Head approval' : 'CEO Go/No-Go approval' : 'Approval status'}>
    <p className="mb-3 text-sm text-muted-foreground">{stageStatus(o)}</p>
    {permitted.length > 0 && <div className="flex flex-wrap gap-2">{permitted.map(choice => <Button key={choice.action} type="button" variant={choice.action === 'APPROVE' ? 'default' : 'outline'} onClick={() => { setSelected(choice); setComment(''); setReasonId(''); setError(undefined); }}>{choice.action === 'APPROVE' ? o.stageId === 1 ? 'Approve & Send to CEO' : 'Approve Go' : choice.label}</Button>)}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !mutation.saving) setSelected(undefined); }}><DialogContent className="opp-dialog"><DialogHeader><DialogTitle>{selected?.label}</DialogTitle><DialogDescription>{selected?.action === 'APPROVE' ? o.stageId === 1 ? 'Move to Qualifying (Go/No-Go), Pending Go/No-Go for CEO review.' : 'Approve Go and move to engineering estimation.' : selected?.action === 'REQUEST_CHANGES' ? 'Keep the current stage and return it for changes.' : 'Keep the current stage and place this opportunity on hold.'}</DialogDescription></DialogHeader>{holding ? <><div className="opp-field space-y-1"><label htmlFor={holdReasonId}>Hold reason <span className="text-destructive">*</span></label><select id={holdReasonId} aria-label="Hold reason" required className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" value={reasonId} onChange={event => { setReasonId(event.target.value); setError(undefined); }} disabled={mutation.saving || reasons.loading || Boolean(reasons.error)}><option value="">Select a reason...</option>{activeReasons.map(reason => <option key={reason.id} value={String(reason.id)}>{reason.reasonName}</option>)}</select></div>{reasons.loading && <p role="status" className="text-sm">Loading hold reasons...</p>}{reasons.error && <Notice error={reasons.error} retry={() => void reasons.refetch()} />}{!reasons.loading && !reasons.error && !activeReasons.length && <p className="text-sm text-muted-foreground">No active hold reasons are available.</p>}</> : <Field label={selected?.action === 'REQUEST_CHANGES' ? 'Changes requested' : 'Decision note'} value={comment} onChange={setComment} multiline required={selected?.action === 'REQUEST_CHANGES'} disabled={mutation.saving} />}{error && <Notice error={error} />}{mutation.error && <Notice error={mutation.error} />}<DialogFooter><Button variant="outline" disabled={mutation.saving} onClick={() => setSelected(undefined)}>Cancel</Button><Button disabled={mutation.saving || (holding && (reasons.loading || Boolean(reasons.error) || !reasonId))} onClick={() => void confirm()}>{mutation.saving ? 'Saving...' : 'Confirm decision'}</Button></DialogFooter></DialogContent></Dialog>
  </Panel>;
}
