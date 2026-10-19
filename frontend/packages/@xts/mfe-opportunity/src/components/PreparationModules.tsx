import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, X } from 'lucide-react';
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@xts/design-system';
import type { Estimation, OpportunityDetail, RiskSeverity, Scope } from '@xts/api-contracts';
import { ReviewActions } from './ReviewActions';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { randomUUID } from '../lib/uuid';
import { useUnsaved } from '../hooks/useUnsaved';
import { estimateTotal, isPreparing, money, RISK_SEVERITY_OPTIONS, rowAmount } from '../lib/workflow';
import { Field, Notice, Panel } from './ui';

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
const SEVERITY_ACCENT: Record<RiskSeverity, string> = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const SEVERITY_BADGE: Record<RiskSeverity, 'success' | 'warning' | 'critical'> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'critical' };
const emptyScope: Scope = { revision: 0, summary: '', alignment: [], risks: [] };

function SeveritySelect({ value, onChange, disabled, label }: { value: RiskSeverity; onChange: (value: RiskSeverity) => void; disabled: boolean; label: string }) {
  return <Select value={value} onValueChange={v => onChange(v as RiskSeverity)} disabled={disabled}><SelectTrigger aria-label={label} className="w-28 shrink-0"><SelectValue /></SelectTrigger><SelectContent>{RISK_SEVERITY_OPTIONS.map(option => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

export function ScopeModule({ opportunity: o, onSaved, readOnly }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; readOnly: boolean }) {
  const service = useOpportunityService(), mutation = useSave();
  const [draft, setDraft] = useState<Scope>(o.scope ?? emptyScope), [baseline, setBaseline] = useState(JSON.stringify(o.scope ?? emptyScope));
  const [newAlignment, setNewAlignment] = useState(''), [newRisk, setNewRisk] = useState<{ description: string; severity: RiskSeverity }>({ description: '', severity: 'HIGH' });
  const [validation, setValidation] = useState<string>();
  const baselineScope = JSON.parse(baseline) as Scope;
  const editable = !readOnly && isPreparing(o) && o.allowedActions.includes('EDIT_SCOPE');
  const dirty = JSON.stringify(draft) !== baseline;
  useUnsaved(dirty);

  function addAlignment() {
    const text = newAlignment.trim(); if (!text) return;
    setDraft(d => ({ ...d, alignment: [...d.alignment, { id: `draft-${randomUUID()}`, text }] })); setNewAlignment('');
  }
  function removeAlignment(id: string) { setDraft(d => ({ ...d, alignment: d.alignment.filter(item => item.id !== id) })); }
  function addRisk() {
    const description = newRisk.description.trim(); if (!description) return;
    setDraft(d => ({ ...d, risks: [...d.risks, { id: `draft-${randomUUID()}`, description, severity: newRisk.severity }] })); setNewRisk({ description: '', severity: 'HIGH' });
  }
  function removeRisk(id: string) { setDraft(d => ({ ...d, risks: d.risks.filter(item => item.id !== id) })); }

  async function save(label: string) {
    if (!editable) return;
    if (!draft.summary.trim()) { setValidation('Enter the project scope before saving.'); return; }
    if (draft.alignment.some(item => !item.text.trim())) { setValidation('Remove any empty alignment items before saving.'); return; }
    if (draft.risks.some(item => !item.description.trim())) { setValidation('Remove any empty risks before saving.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ scope: draft, revision: o.revision }), key => service.saveScope({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, scope: draft }), value => { if (value.scope) { setDraft(value.scope); setBaseline(JSON.stringify(value.scope)); } onSaved(value); }, label);
  }

  return <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-3">
      <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon headerRight={<span className="text-xs font-semibold text-amber-600">Required</span>}>
        <Textarea aria-label="Scope summary" rows={6} value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} disabled={!editable || mutation.saving} placeholder="Describe the project scope…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{draft.summary.length} characters</span>
          {editable && <div className="flex items-center gap-3">{draft.summary !== baselineScope.summary && <span className="text-xs text-amber-600">Unsaved changes</span>}<Button type="button" size="sm" disabled={mutation.saving || draft.summary === baselineScope.summary} onClick={() => void save('Scope saved.')}>Save scope</Button></div>}
        </div>
      </Panel>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Panel title="Risks" tone="amber" icon={AlertTriangle} accentIcon headerRight={<span className="text-xs text-muted-foreground">{draft.risks.length} item{draft.risks.length === 1 ? '' : 's'}</span>}>
          <ul className="space-y-2">{draft.risks.map(risk => <li key={risk.id} className="flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/20" style={{ borderLeft: `4px solid ${SEVERITY_ACCENT[risk.severity]}` }}>
            <span className="flex-1 break-words text-sm">{risk.description}</span>
            <Badge variant={SEVERITY_BADGE[risk.severity]} size="sm" className="shrink-0">{RISK_SEVERITY_OPTIONS.find(option => option.id === risk.severity)?.label}</Badge>
            {editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${risk.description || 'risk'}`} disabled={mutation.saving} onClick={() => removeRisk(risk.id)}><X className="size-4" /></Button>}
          </li>)}</ul>
          {!draft.risks.length && <p className="text-sm text-muted-foreground">No risks logged yet.</p>}
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add risk" placeholder="Add risk…" value={newRisk.description} onChange={e => setNewRisk(r => ({ ...r, description: e.target.value }))} disabled={mutation.saving} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRisk(); } }} /><SeveritySelect label="New risk severity" value={newRisk.severity} onChange={severity => setNewRisk(r => ({ ...r, severity }))} disabled={mutation.saving} /><Button type="button" variant="outline" disabled={mutation.saving || !newRisk.description.trim()} onClick={addRisk}>Add</Button></div>}
          {editable && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">{JSON.stringify(draft.risks) !== JSON.stringify(baselineScope.risks) && <span className="text-xs text-amber-600">Unsaved changes</span>}<Button type="button" size="sm" className="ml-auto" disabled={mutation.saving || JSON.stringify(draft.risks) === JSON.stringify(baselineScope.risks)} onClick={() => void save('Risks saved.')}>Save risks</Button></div>}
        </Panel>
        <Panel title="Alignment" tone="teal" icon={CheckCircle2} accentIcon headerRight={<span className="text-xs text-muted-foreground">{draft.alignment.length} item{draft.alignment.length === 1 ? '' : 's'}</span>}>
          <ul className="space-y-2">{draft.alignment.map(item => <li key={item.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"><span className="size-2 shrink-0 rounded-sm bg-teal-500" aria-hidden="true" /><span className="flex-1 break-words text-sm">{item.text}</span>{editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.text || 'alignment item'}`} disabled={mutation.saving} onClick={() => removeAlignment(item.id)}><X className="size-4" /></Button>}</li>)}</ul>
          {!draft.alignment.length && <p className="text-sm text-muted-foreground">No alignment items yet.</p>}
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add alignment item" placeholder="Add alignment item (e.g. tech stack, standard, pricing model)" value={newAlignment} onChange={e => setNewAlignment(e.target.value)} disabled={mutation.saving} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlignment(); } }} /><Button type="button" variant="outline" disabled={mutation.saving || !newAlignment.trim()} onClick={addAlignment}>Add</Button></div>}
          {editable && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">{JSON.stringify(draft.alignment) !== JSON.stringify(baselineScope.alignment) && <span className="text-xs text-amber-600">Unsaved changes</span>}<Button type="button" size="sm" className="ml-auto" disabled={mutation.saving || JSON.stringify(draft.alignment) === JSON.stringify(baselineScope.alignment)} onClick={() => void save('Alignment saved.')}>Save alignment</Button></div>}
        </Panel>
      </div>
      {(validation || mutation.error) && <Notice error={validation ?? mutation.error!} />}
    </div>
    <aside className="space-y-3" aria-label="Assessment summary">
      <Panel title="Assessment summary" tone="indigo" accentIcon className="bg-emerald-50/40">
        <div className="space-y-3">
          <div><strong className="text-3xl text-teal-700 dark:text-teal-300">{draft.alignment.length}</strong><p className="text-xs text-muted-foreground">Alignment</p></div>
          <div><strong className="text-3xl text-amber-600 dark:text-amber-300">{draft.risks.length}</strong><p className="text-xs text-muted-foreground">Risks</p></div>
          <div><strong className="text-3xl text-destructive">{draft.risks.filter(item => item.severity === 'HIGH').length}</strong><p className="text-xs text-muted-foreground">High risk</p></div>
        </div>
      </Panel>
    </aside>
  </div>;
}
