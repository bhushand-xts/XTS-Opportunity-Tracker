import { useEffect, useState } from 'react';
import { Badge, Button } from '@xts/design-system';
import type { OpportunityDetail, ResponseItem } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { canAnswer, canReview, isPreparing, RESPONSE_LABELS, userLabel, validDate } from '../lib/workflow';
import { Field, Notice, Panel } from './ui';
import { EligibleUserSelect } from './EligibleUserSelect';

function ResponseEditor({ opportunity: o, response: r, onSaved, formDirty, onDirtyChange }: { opportunity: OpportunityDetail; response: ResponseItem; onSaved: (saved: OpportunityDetail) => void; formDirty: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const access = useOpportunityAccess(), service = useOpportunityService(), mutation = useSave();
  const [answer, setAnswer] = useState(r.answer), [answerBaseline, setAnswerBaseline] = useState(r.answer), [ownerId, setOwnerId] = useState(r.owner?.id ?? ''), [reviewerId, setReviewerId] = useState(r.reviewer?.id ?? ''), [dueDate, setDueDate] = useState(r.dueDate ?? ''), [comment, setComment] = useState(''), [validation, setValidation] = useState<string>();
  const answerDirty = answer !== answerBaseline;
  const assignmentDirty = ownerId !== (r.owner?.id ?? '') || reviewerId !== (r.reviewer?.id ?? '') || dueDate !== (r.dueDate ?? '');
  useUnsaved(answerDirty || assignmentDirty || Boolean(comment));
  useEffect(() => { onDirtyChange?.(answerDirty || assignmentDirty || Boolean(comment)); return () => onDirtyChange?.(false); }, [answerDirty, assignmentDirty, comment, onDirtyChange]);
  useEffect(() => {
    // Server updates to other form sections must never discard an unsaved answer.
    if (!answerDirty) { setAnswer(r.answer); setAnswerBaseline(r.answer); }
  }, [r.answer, r.revision, answerDirty]);
  const manage = isPreparing(o) && o.allowedActions.includes('ASSIGN') && r.allowedActions.includes('ASSIGN');
  const draft = canAnswer(o, r, access.userId) && r.allowedActions.includes('SAVE_ANSWER');
  const submit = canAnswer(o, r, access.userId) && r.allowedActions.includes('SUBMIT_ANSWER');
  const review = canReview(o, r, access.userId) && r.allowedActions.includes('REVIEW_ANSWER');
  const blocked = formDirty || mutation.saving;
  const command = (key: string) => ({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, responseId: r.id, responseRevision: r.revision });
  const saved = (value: OpportunityDetail) => { const response = value.responses?.find(item => item.id === r.id); if (response) { setAnswerBaseline(response.answer); setAnswer(response.answer); setOwnerId(response.owner?.id ?? ''); setReviewerId(response.reviewer?.id ?? ''); setDueDate(response.dueDate ?? ''); } setComment(''); onSaved(value); };
  async function assign() {
    if (!manage || blocked) return;
    if (!ownerId || !reviewerId || ownerId === reviewerId || !validDate(dueDate)) { setValidation('Choose different active owners and reviewers, and a valid due date.'); return; }
    if ((ownerId === r.owner?.id && !r.owner.active) || (reviewerId === r.reviewer?.id && !r.reviewer.active)) { setValidation('Replace inactive assigned users with eligible active users.'); return; }
    if (answerDirty) { setValidation('Save the unsaved answer before changing its assignment.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ action: 'assign', o: o.revision, r: r.revision, ownerId, reviewerId, dueDate }), key => service.assign({ ...command(key), ownerId, reviewerId, dueDate }), saved, 'Assignment saved.');
  }
  async function saveAnswer(submitting: boolean) {
    if (blocked || (submitting ? !submit : !draft)) return;
    if (assignmentDirty) { setValidation('Save assignment changes before submitting or saving the answer.'); return; }
    if (submitting && !answer.trim()) { setValidation('Enter an answer before submitting.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ action: submitting ? 'submitAnswer' : 'draft', revision: r.revision, answer }), key => service.answer({ ...command(key), answer, submit: submitting }), saved, submitting ? 'Current answer revision submitted to the reviewer.' : 'Answer draft saved.');
  }
  async function reviewAnswer(approved: boolean) {
    if (!review || blocked || r.submittedRevision === null) return;
    if (!approved && !comment.trim()) { setValidation('Enter a reason for requested changes.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ action: approved ? 'approveAnswer' : 'changes', revision: r.revision, comment }), key => service.reviewAnswer({ ...command(key), approved, reason: comment.trim(), submittedRevision: r.submittedRevision! }), saved, approved ? 'Answer revision approved.' : 'Changes requested.');
  }
  return <Panel title={r.title} description={`${RESPONSE_LABELS[r.state]} · revision ${r.revision}`} tone="indigo">
    {formDirty && <p className="opp-notice">Save opportunity/RFP edits before modifying assignments or answer revisions. Your unsaved answer remains here.</p>}
    {r.sourceReference && <p className="mb-3 text-xs text-muted-foreground">Source: {r.sourceReference}</p>}
    <div className="opp-fields"><EligibleUserSelect label="Answer owner" opportunityId={o.id} purpose="OWNER" value={ownerId} selected={r.owner} onChange={setOwnerId} disabled={!manage || blocked} /><EligibleUserSelect label="Independent reviewer" opportunityId={o.id} purpose="REVIEWER" value={reviewerId} selected={r.reviewer} onChange={setReviewerId} disabled={!manage || blocked} /><Field label="Response due date" type="date" value={dueDate} onChange={setDueDate} disabled={!manage || blocked} />{manage && <Button type="button" variant="outline" className="self-end" disabled={blocked} onClick={() => void assign()}>Save assignment</Button>}</div>
    {r.reviewComment && <p className="opp-notice mt-3">Reviewer: {r.reviewComment}</p>}
    <div className="mt-3"><Field label="Answer / section response" multiline value={answer} onChange={setAnswer} disabled={!draft && !submit || mutation.saving} hint={answerDirty ? 'Unsaved answer draft' : `Saved revision ${r.revision}`} /></div>
    <div className="mt-3 flex flex-wrap gap-3">{draft && <Button type="button" variant="outline" disabled={blocked} onClick={() => void saveAnswer(false)}>Save draft</Button>}{submit && <Button type="button" disabled={blocked} onClick={() => void saveAnswer(true)}>Submit to reviewer</Button>}</div>
    {review && <div className="mt-3 space-y-3"><Field label="Review comment (required for changes)" multiline value={comment} onChange={setComment} disabled={mutation.saving} /><div className="flex flex-wrap gap-3"><Button type="button" disabled={blocked} onClick={() => void reviewAnswer(true)}>Approve response</Button><Button type="button" variant="outline" disabled={blocked} onClick={() => void reviewAnswer(false)}>Request changes</Button></div></div>}
    {!draft && !submit && !review && <p className="mt-3 text-sm text-muted-foreground">Read-only response. Actions depend on your assignment, permissions and the current stage.</p>}
    {validation && <div className="mt-3"><Notice error={validation} /></div>}{mutation.error && <div className="mt-3"><Notice error={mutation.error} /></div>}
  </Panel>;
}
export function ResponseWorkspace({ opportunity, onSaved, formDirty = false, onDirtyChange }: { opportunity: OpportunityDetail; onSaved: (saved: OpportunityDetail) => void; formDirty?: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [selectedId, setSelectedId] = useState<string>(), [myOnly, setMyOnly] = useState(false), access = useOpportunityAccess();
  const confirm = useUnsaved(false);
  const responses = (opportunity.responses ?? []).filter(r => !myOnly || r.owner?.id === access.userId || r.reviewer?.id === access.userId);
  const selected = responses.find(r => r.id === selectedId) ?? responses[0];
  return <div className="opp-assignment"><Panel title="Questions & sections" description="Response items visible to you" tone="violet"><Button type="button" variant="outline" className="mb-3" aria-pressed={myOnly} onClick={async () => { if (await confirm()) setMyOnly(x => !x); }}>{myOnly ? 'Show permitted items' : 'Show my assignments'}</Button><div className="space-y-2">{responses.map(r => <Button key={r.id} type="button" variant="outline" className={`opp-task ${selected?.id === r.id ? 'opp-selected' : ''}`} aria-pressed={selected?.id === r.id} onClick={async () => { if (selected?.id !== r.id && await confirm()) setSelectedId(r.id); }}><span><strong className="block">{r.title}</strong><Badge variant="secondary" className="my-2">{RESPONSE_LABELS[r.state]}</Badge><small className="block font-normal text-muted-foreground">{userLabel(r.owner)}</small></span></Button>)}{responses.length === 0 && <p className="opp-empty">No response items available for this scope. Prepare questions or sections before assignment.</p>}</div></Panel>{selected ? <ResponseEditor key={selected.id} opportunity={opportunity} response={selected} onSaved={onSaved} formDirty={formDirty} onDirtyChange={onDirtyChange} /> : <Panel title="Response workspace" tone="indigo"><p className="text-sm text-muted-foreground">Select or prepare response items to assign owners and reviewers.</p></Panel>}</div>;
}
