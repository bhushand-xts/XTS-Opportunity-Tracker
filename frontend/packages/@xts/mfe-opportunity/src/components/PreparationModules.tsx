import { useState } from 'react';
import { ReviewActions } from './ReviewActions';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import type { Estimation, OpportunityDetail, Scope } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { estimateTotal, isPreparing, money, rowAmount, SCOPE_FIELDS } from '../lib/workflow';
import { Field, Notice, Panel, Values } from './ui';

export function EstimationModule({ opportunity: o, onSaved, readOnly }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; readOnly: boolean }) {
  const service = useOpportunityService(), mutation = useSave();
  const [draft, setDraft] = useState<Estimation>(() => o.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0.00' }), [baseline, setBaseline] = useState(() => JSON.stringify(o.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0.00' })), [validation, setValidation] = useState<string>();
  const editable = !readOnly && (o.stageId != null ? o.stageId === 3 && o.subStageId === 7 : isPreparing(o)) && o.allowedActions.includes('EDIT_ESTIMATION');
  useUnsaved(JSON.stringify(draft) !== baseline);
  let total = '0.00', calculationError: string | undefined;
  try { total = estimateTotal(draft.rows); } catch (error) { calculationError = error instanceof Error ? error.message : 'Check numeric fields.'; }
  async function save() {
    if (!editable) return;
    if (calculationError || draft.rows.some(row => !row.workItem.trim())) { setValidation(calculationError ?? 'Enter a work item for every row.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ estimation: draft, revision: o.revision }), key => service.saveEstimation({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, estimation: { ...draft, total } }), saved => { if (saved.estimation) { setDraft(saved.estimation); setBaseline(JSON.stringify(saved.estimation)); } onSaved(saved); }, 'Estimation saved. Overview now shows the saved revision.');
  }
  return <><Panel title="Estimation matrix" description={`Engineering estimation · ${o.currencyCode} · saved revision ${o.estimation?.revision ?? 0}`} tone="indigo"><p className="mb-3 text-sm text-muted-foreground">{editable ? 'Save the matrix to update the Overview summary.' : 'Read-only estimation for your permissions or this stage.'}</p><div className="opp-estimation-scroll"><Table><TableHeader><TableRow><TableHead>Work item / role</TableHead><TableHead>Hours / person</TableHead><TableHead>People</TableHead><TableHead>Rate / hour</TableHead><TableHead>Amount</TableHead>{editable && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{draft.rows.map((row, index) => { let amount = '—'; try { amount = money(rowAmount(row), o.currencyCode); } catch { /* validation shown below */ } return <TableRow key={row.id}><TableCell>{editable ? <Field label={`Work item ${index + 1}`} value={row.workItem} onChange={v => setDraft(d => ({ ...d, rows: d.rows.map(r => r.id === row.id ? { ...r, workItem: v } : r) }))} disabled={mutation.saving} /> : row.workItem}</TableCell>{(['hours', 'people', 'hourlyRate'] as const).map((key, col) => <TableCell key={key}>{editable ? <Field label={`${['Hours', 'People', 'Rate'][col]} ${index + 1}`} type="number" value={String(row[key])} onChange={v => setDraft(d => ({ ...d, rows: d.rows.map(r => r.id === row.id ? { ...r, [key]: key === 'people' ? Number(v) : v } : r) }))} disabled={mutation.saving} /> : row[key]}</TableCell>)}<TableCell>{amount}</TableCell>{editable && <TableCell><Button type="button" variant="ghost" disabled={mutation.saving} aria-label={`Remove row ${index + 1}`} onClick={() => setDraft(d => ({ ...d, rows: d.rows.filter(r => r.id !== row.id) }))}>Remove</Button></TableCell>}</TableRow>; })}{!draft.rows.length && <TableRow><TableCell colSpan={editable ? 6 : 5}>No estimation rows yet.</TableCell></TableRow>}</TableBody></Table></div>{editable && <Button type="button" variant="outline" className="my-4" disabled={mutation.saving} onClick={() => setDraft(d => ({ ...d, rows: [...d.rows, { id: `draft-${crypto.randomUUID()}`, workItem: '', hours: '0', people: 1, hourlyRate: '0' }] }))}>Add row</Button>}<div className="mt-3"><Field label="Estimation assumptions" value={draft.assumptions} onChange={v => setDraft(d => ({ ...d, assumptions: v }))} multiline disabled={!editable || mutation.saving} /></div><div className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-3"><div><p className="text-xs text-muted-foreground">Calculated total</p><strong className="text-xl">{calculationError ? 'Check matrix values' : money(total, o.currencyCode)}</strong></div>{editable && <Button type="button" disabled={mutation.saving} onClick={() => void save()}>Save estimation</Button>}</div>{(validation || calculationError) && <Notice error={validation ?? calculationError!} />}{mutation.error && <Notice error={mutation.error} />}</Panel>{o.allowedActions.includes('SUBMIT_ESTIMATE') && JSON.stringify(draft) === baseline && <ReviewActions opportunity={o} onSaved={onSaved} />}</>;
}
export function ScopeModule({ opportunity: o, onSaved, readOnly }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; readOnly: boolean }) {
  const service = useOpportunityService(), mutation = useSave();
  const empty: Scope = { revision: 0, objective: '', deliverables: '', inclusions: '', exclusions: '', dependencies: '', acceptance: '' };
  const [draft, setDraft] = useState(o.scope ?? empty), [baseline, setBaseline] = useState(JSON.stringify(o.scope ?? empty));
  const editable = !readOnly && isPreparing(o) && o.allowedActions.includes('EDIT_SCOPE');
  useUnsaved(JSON.stringify(draft) !== baseline);
  async function save() {
    if (!editable) return;
    await mutation.run(JSON.stringify({ scope: draft, revision: o.revision }), key => service.saveScope({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, scope: draft }), value => { if (value.scope) { setDraft(value.scope); setBaseline(JSON.stringify(value.scope)); } onSaved(value); }, 'Scope saved. Overview now shows the saved revision.');
  }
  return <Panel title="Scope definition" description={`Saved revision ${o.scope?.revision ?? 0} · define the work and its boundaries`} tone="violet">{editable ? <div className="opp-fields">{Object.entries(SCOPE_FIELDS).map(([key, label]) => <Field key={key} label={label} value={draft[key as keyof typeof SCOPE_FIELDS]} onChange={v => setDraft(d => ({ ...d, [key]: v }))} multiline disabled={mutation.saving} />)}</div> : <Values values={Object.entries(SCOPE_FIELDS).map(([key, label]) => [label, draft[key as keyof typeof SCOPE_FIELDS]])} />}{editable && <div className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-3"><p className="text-sm text-muted-foreground">Unsaved edits do not appear on Overview.</p><Button type="button" disabled={mutation.saving} onClick={() => void save()}>Save scope</Button></div>}{mutation.error && <Notice error={mutation.error} />}</Panel>;
}
