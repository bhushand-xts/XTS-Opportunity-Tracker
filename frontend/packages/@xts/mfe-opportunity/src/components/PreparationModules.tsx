import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { AlertTriangle, CheckCircle2, ClipboardList, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, cn, DonutChart, DonutChartLegend, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useAuth } from '@xts/design-system';
import type { Currency, Estimation, EstimationPhase, OpportunityDetail, RateMaster, RiskSeverity, Scope } from '@xts/api-contracts';
import { ReviewActions } from './ReviewActions';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { randomUUID } from '../lib/uuid';
import { useUnsaved } from '../hooks/useUnsaved';
import { estimateTotal, isPreparing, money, RISK_SEVERITY_OPTIONS, rowAmount } from '../lib/workflow';
import { Field, Notice, Panel, Values } from './ui';
import { GET_ESTIMATION_MASTERS, UPDATE_RATE_MASTER } from '../services/estimationMasters.queries';

const RATE_MASTER_MENU_KEY = 'technical_roles_and_rate_master';
// Documented assumptions: mst_rate stores a Monthly reference rate, and the
// backend's EstimateRow only has hours/people/hourlyRate — no weeks or role
// fields. The grid converts person-weeks to hours/rate at a standard 40-hour
// week so the existing (unchanged) rowAmount/estimateTotal math — and the real
// saveOpportunityEstimation mutation — keep working exactly as before.
const HOURS_PER_WEEK = 40;
const WEEKS_PER_MONTH = 52 / 12;
function weeklyRate(rate: RateMaster): number {
  return rate.rateType.trim().toLowerCase() === 'monthly' ? rate.defaultRate / WEEKS_PER_MONTH : rate.defaultRate;
}
function gridRowId(phaseId: number, roleCode: string) { return `grid-${phaseId}-${roleCode}`; }
function trimDecimal(value: number) { return String(Math.round(value * 100) / 100); }

export function EstimationModule({ opportunity: o, onSaved, readOnly }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; readOnly: boolean }) {
  const service = useOpportunityService(), mutation = useSave(), auth = useAuth();
  const { data: masters } = useQuery<{ estimationPhasesList: (EstimationPhase | null)[] | null; rateMasters: (RateMaster | null)[] | null; currencies: (Currency | null)[] | null }>(GET_ESTIMATION_MASTERS, { fetchPolicy: 'network-only' });
  const phases = (masters?.estimationPhasesList ?? []).filter((p): p is EstimationPhase => Boolean(p?.isActive)).sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.phaseName.localeCompare(b.phaseName));
  const roles = (masters?.rateMasters ?? []).filter((r): r is RateMaster => Boolean(r?.isActive)).sort((a, b) => a.roleName.localeCompare(b.roleName));
  const currencies = (masters?.currencies ?? []).filter((c): c is Currency => c != null);
  const canViewRates = auth.hasPermission(RATE_MASTER_MENU_KEY, 'view');
  const canEditRates = auth.hasPermission(RATE_MASTER_MENU_KEY, 'edit');
  const [updateRateMaster] = useMutation<{ updateRateMaster: RateMaster }>(UPDATE_RATE_MASTER, { refetchQueries: [{ query: GET_ESTIMATION_MASTERS }] });
  const [rateEdits, setRateEdits] = useState<Record<number, string>>({});
  const [savingRateId, setSavingRateId] = useState<number | null>(null);
  const [rateError, setRateError] = useState<string>();
  async function saveRate(role: RateMaster) {
    const raw = rateEdits[role.ratemasterId];
    if (raw === undefined) return;
    const weeklyValue = Number(raw);
    if (!raw.trim() || !Number.isFinite(weeklyValue) || weeklyValue < 0) { setRateError('Enter a valid, non-negative cost per week.'); return; }
    const isMonthly = role.rateType.trim().toLowerCase() === 'monthly';
    setRateError(undefined); setSavingRateId(role.ratemasterId);
    try {
      await updateRateMaster({ variables: { ratemasterId: role.ratemasterId, input: {
        roleName: role.roleName, roleCode: role.roleCode, currencyId: role.currencyId, rateType: role.rateType,
        defaultRate: Number((isMonthly ? weeklyValue * WEEKS_PER_MONTH : weeklyValue).toFixed(2)),
        location: role.location, description: role.description, updatedBy: auth.session?.userId ? Number(auth.session.userId) : undefined,
      } } });
      setRateEdits(edits => { const next = { ...edits }; delete next[role.ratemasterId]; return next; });
    } catch (error) {
      setRateError(error instanceof Error ? error.message : 'Failed to update the rate. Please retry.');
    } finally { setSavingRateId(null); }
  }

  const [draft, setDraft] = useState<Estimation>(() => o.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0.00' }), [baseline, setBaseline] = useState(() => JSON.stringify(o.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0.00' })), [validation, setValidation] = useState<string>();
  const editable = !readOnly && isPreparing(o) && o.allowedActions.includes('EDIT_ESTIMATION');
  useUnsaved(JSON.stringify(draft) !== baseline);
  let total = '0.00', calculationError: string | undefined;
  try { total = estimateTotal(draft.rows); } catch (error) { calculationError = error instanceof Error ? error.message : 'Check numeric fields.'; }

  const gridIds = new Set(phases.flatMap(p => roles.map(r => gridRowId(p.id, r.roleCode))));
  const legacyRows = draft.rows.filter(r => !gridIds.has(r.id));
  function cellWeeksNumber(phaseId: number, roleCode: string) {
    const row = draft.rows.find(r => r.id === gridRowId(phaseId, roleCode));
    return row ? Number(row.hours) / HOURS_PER_WEEK : 0;
  }
  function setCellWeeks(phaseId: number, roleCode: string, raw: string) {
    const id = gridRowId(phaseId, roleCode), weeksNum = Number(raw);
    setDraft(d => {
      if (!raw.trim() || !Number.isFinite(weeksNum) || weeksNum <= 0) return { ...d, rows: d.rows.filter(r => r.id !== id) };
      const role = roles.find(r => r.roleCode === roleCode), phase = phases.find(p => p.id === phaseId);
      const row = { id, workItem: `${phase?.phaseName ?? 'Phase'} — ${role?.roleName ?? roleCode}`, hours: trimDecimal(weeksNum * HOURS_PER_WEEK), people: 1, hourlyRate: role ? (weeklyRate(role) / HOURS_PER_WEEK).toFixed(4) : '0' };
      return { ...d, rows: d.rows.some(r => r.id === id) ? d.rows.map(r => r.id === id ? row : r) : [...d.rows, row] };
    });
  }
  function removeRow(id: string) { setDraft(d => ({ ...d, rows: d.rows.filter(r => r.id !== id) })); }
  const effortTotal = phases.reduce((sum, p) => sum + roles.reduce((s, r) => s + cellWeeksNumber(p.id, r.roleCode), 0), 0);

  async function save() {
    if (!editable) return;
    if (calculationError || draft.rows.some(row => !row.workItem.trim())) { setValidation(calculationError ?? 'Enter a work item for every row.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ estimation: draft, revision: o.revision }), key => service.saveEstimation({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, estimation: { ...draft, total } }), saved => { if (saved.estimation) { setDraft(saved.estimation); setBaseline(JSON.stringify(saved.estimation)); } onSaved(saved); }, 'Estimation saved. Overview now shows the saved revision.');
  }
  return <>
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-3">
        <Panel title="Effort by phase & role" description="person-weeks" tone="indigo">
          <p className="mb-3 text-sm text-muted-foreground">{editable ? 'Enter effort per role; totals feed the cost summary automatically.' : 'Read-only estimation for your permissions or this stage.'}</p>
          {!phases.length || !roles.length ? <p className="text-sm text-muted-foreground">{!phases.length ? 'No active estimation phases are configured yet.' : 'No active rate master roles are configured yet.'} Set these up in Administration before building the grid.</p> : <div className="opp-estimation-scroll"><Table><TableHeader><TableRow><TableHead>Phase</TableHead>{roles.map(role => <TableHead key={role.roleCode}>{role.roleName}</TableHead>)}<TableHead>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {phases.map(phase => <TableRow key={phase.id}><TableCell className="font-medium">{phase.phaseName}</TableCell>{roles.map(role => { const weeks = cellWeeksNumber(phase.id, role.roleCode); return <TableCell key={role.roleCode}>{editable ? <Input aria-label={`${phase.phaseName} — ${role.roleName} weeks`} type="number" min="0" step="0.5" className="w-20" value={weeks ? trimDecimal(weeks) : ''} onChange={e => setCellWeeks(phase.id, role.roleCode, e.target.value)} disabled={mutation.saving} /> : weeks ? trimDecimal(weeks) : '—'}</TableCell>; })}<TableCell className="font-semibold">{trimDecimal(roles.reduce((s, r) => s + cellWeeksNumber(phase.id, r.roleCode), 0))}</TableCell></TableRow>)}
              <TableRow className="font-semibold"><TableCell>Total</TableCell>{roles.map(role => <TableCell key={role.roleCode}>{trimDecimal(phases.reduce((s, p) => s + cellWeeksNumber(p.id, role.roleCode), 0))}</TableCell>)}<TableCell>{trimDecimal(effortTotal)}</TableCell></TableRow>
            </TableBody>
          </Table></div>}
        </Panel>
        <Panel title="Additional items" description="Not tied to a phase/role, e.g. travel or contingency" tone="neutral">
          <Table><TableHeader><TableRow><TableHead>Work item</TableHead><TableHead>Hours</TableHead><TableHead>People</TableHead><TableHead>Rate / hour</TableHead><TableHead>Amount</TableHead>{editable && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{legacyRows.map((row, index) => { let amount = '—'; try { amount = money(rowAmount(row), o.currencyCode); } catch { /* validation shown below */ } return <TableRow key={row.id}><TableCell>{editable ? <Field label={`Work item ${index + 1}`} value={row.workItem} onChange={v => setDraft(d => ({ ...d, rows: d.rows.map(r => r.id === row.id ? { ...r, workItem: v } : r) }))} disabled={mutation.saving} /> : row.workItem}</TableCell>{(['hours', 'people', 'hourlyRate'] as const).map((key, col) => <TableCell key={key}>{editable ? <Field label={`${['Hours', 'People', 'Rate'][col]} ${index + 1}`} type="number" value={String(row[key])} onChange={v => setDraft(d => ({ ...d, rows: d.rows.map(r => r.id === row.id ? { ...r, [key]: key === 'people' ? Number(v) : v } : r) }))} disabled={mutation.saving} /> : row[key]}</TableCell>)}<TableCell>{amount}</TableCell>{editable && <TableCell><Button type="button" variant="ghost" disabled={mutation.saving} aria-label={`Remove row ${index + 1}`} onClick={() => removeRow(row.id)}>Remove</Button></TableCell>}</TableRow>; })}{!legacyRows.length && <TableRow><TableCell colSpan={editable ? 6 : 5}>No additional items.</TableCell></TableRow>}</TableBody></Table>
          {editable && <Button type="button" variant="outline" className="mt-3" disabled={mutation.saving} onClick={() => setDraft(d => ({ ...d, rows: [...d.rows, { id: `draft-${randomUUID()}`, workItem: '', hours: '0', people: 1, hourlyRate: '0' }] }))}>Add row</Button>}
        </Panel>
        <div><Field label="Estimation assumptions" value={draft.assumptions} onChange={v => setDraft(d => ({ ...d, assumptions: v }))} multiline disabled={!editable || mutation.saving} /></div>
        {editable && <div className="flex justify-end"><Button type="button" disabled={mutation.saving} onClick={() => void save()}>Save estimation</Button></div>}
        {(validation || calculationError) && <Notice error={validation ?? calculationError!} />}{mutation.error && <Notice error={mutation.error} />}
      </div>
      <aside className="space-y-3">
        {canViewRates && <Panel title="Rate master" description={canEditRates ? 'Reference rates — editing here updates the shared rate for every opportunity' : 'Reference rates — managed by Finance, read-only here'} tone="amber">
          <Table><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Cost / wk</TableHead><TableHead>Weeks</TableHead>{canEditRates && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{roles.map(role => { const currentWeekly = trimDecimal(weeklyRate(role)), draftValue = rateEdits[role.ratemasterId], dirty = draftValue !== undefined && draftValue !== currentWeekly; return <TableRow key={role.roleCode}><TableCell>{role.roleName}</TableCell><TableCell>{canEditRates ? <Input aria-label={`${role.roleName} cost per week`} type="number" min="0" step="0.01" className="w-28" value={draftValue ?? currentWeekly} onChange={e => setRateEdits(edits => ({ ...edits, [role.ratemasterId]: e.target.value }))} disabled={savingRateId === role.ratemasterId} /> : money(currentWeekly, currencies.find(c => c.currencyId === role.currencyId)?.currencyCode ?? o.currencyCode)}</TableCell><TableCell>{trimDecimal(phases.reduce((s, p) => s + cellWeeksNumber(p.id, role.roleCode), 0))}</TableCell>{canEditRates && <TableCell><Button type="button" size="sm" variant="outline" disabled={!dirty || savingRateId === role.ratemasterId} onClick={() => void saveRate(role)}>Save</Button></TableCell>}</TableRow>; })}{!roles.length && <TableRow><TableCell colSpan={canEditRates ? 4 : 3}>No active rates configured.</TableCell></TableRow>}</TableBody></Table>
          {rateError && <Notice error={rateError} />}
        </Panel>}
        <Panel title="Estimate summary" tone="violet">
          <Values values={[['Total effort', `${trimDecimal(effortTotal)} person-weeks`], ...(canViewRates ? ([['Estimated cost', calculationError ? 'Check matrix values' : money(total, o.currencyCode)]] as [string, string][]) : [])]} />
        </Panel>
      </aside>
    </div>
    {o.allowedActions.includes('SUBMIT_ESTIMATE') && JSON.stringify(draft) === baseline && <ReviewActions opportunity={o} onSaved={onSaved} />}
  </>;
}
const SEVERITY_BADGE: Record<RiskSeverity, 'success' | 'warning' | 'critical'> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'critical' };
const SEVERITY_COLOR: Record<RiskSeverity, string> = { LOW: '#089b6a', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const emptyScope: Scope = { revision: 0, summary: '', alignment: [], risks: [] };

function SeveritySelect({ value, onChange, disabled, label }: { value: RiskSeverity; onChange: (value: RiskSeverity) => void; disabled: boolean; label: string }) {
  return <Select value={value} onValueChange={v => onChange(v as RiskSeverity)} disabled={disabled}><SelectTrigger aria-label={label} className="w-28 shrink-0"><SelectValue /></SelectTrigger><SelectContent>{RISK_SEVERITY_OPTIONS.map(option => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

/** Severity shown as a badge; clickable (a severity picker menu) wherever `onChange` is given. */
function RiskSeverityBadge({ severity, editable, disabled, onChange }: { severity: RiskSeverity; editable: boolean; disabled?: boolean; onChange?: (severity: RiskSeverity) => void }) {
  const label = RISK_SEVERITY_OPTIONS.find(option => option.id === severity)?.label;
  const badge = <Badge variant={SEVERITY_BADGE[severity]} size="sm" className="shrink-0">{label}</Badge>;
  if (!editable || !onChange) return badge;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><button type="button" disabled={disabled} className="shrink-0 rounded-full disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Change severity, currently ${label}`}>{badge}</button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">{RISK_SEVERITY_OPTIONS.map(option => <DropdownMenuItem key={option.id} onSelect={() => onChange(option.id as RiskSeverity)}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent>
  </DropdownMenu>;
}
/** Double-click to edit a Risk/Alignment item's text in place; Enter or blur commits, Escape reverts. */
function InlineEditableText({ value, editable, disabled, onCommit, ariaLabel }: { value: string; editable: boolean; disabled?: boolean; onCommit: (value: string) => void; ariaLabel: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  function start() { if (!editable || disabled) return; setDraft(value); setEditing(true); }
  function commit() {
    setEditing(false);
    const text = draft.trim();
    if (text && text !== value) onCommit(text);
  }
  if (editing) return <Input autoFocus aria-label={ariaLabel} value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); setDraft(value); setEditing(false); }
  }} className="h-7 flex-1 px-1.5 py-0 text-sm" />;
  return <span className={cn('min-w-0 flex-1 break-words text-sm', editable && 'cursor-text')} onDoubleClick={start} title={editable ? 'Double-click to edit' : undefined}>{value}</span>;
}
/** Confirms a Risk/Alignment removal before it happens — a single reusable dialog instance driven by whichever item is pending deletion. */
function ConfirmRemoveDialog({ open, label, onCancel, onConfirm }: { open: boolean; label: string; onCancel: () => void; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this item?</AlertDialogTitle>
        <AlertDialogDescription>“{label}” will be removed from the scope. This can't be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
/** Read-only Risks/Alignment presentation shared with the Overview drawer — same whole-card accent border as the editable Scope tab, minus the add/remove/edit controls. */
export function ScopeReadOnly({ scope }: { scope: Scope }) {
  return <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
    <Panel title="Alignment" tone="teal" icon={CheckCircle2} accentIcon headerRight={<span className="text-xs text-muted-foreground">{scope.alignment.length} item{scope.alignment.length === 1 ? '' : 's'}</span>}>
      <ul className="space-y-1">{scope.alignment.map(item => <li key={item.id} className="flex items-center gap-2 rounded-md bg-teal-50/70 px-2 py-1.5 transition-colors hover:bg-teal-100 dark:bg-teal-950/10 dark:hover:bg-teal-950/30"><span className="size-1.5 shrink-0 rounded-sm bg-teal-500" aria-hidden="true" /><span className="min-w-0 flex-1 break-words text-sm">{item.text}</span></li>)}</ul>
      {!scope.alignment.length && <p className="text-sm text-muted-foreground">No alignment items logged.</p>}
    </Panel>
    <Panel title="Risks" tone="amber" icon={AlertTriangle} accentIcon headerRight={<span className="text-xs text-muted-foreground">{scope.risks.length} item{scope.risks.length === 1 ? '' : 's'}</span>}>
      <ul className="space-y-1">{scope.risks.map(risk => <li key={risk.id} className="flex items-center gap-2 rounded-md bg-amber-50/70 px-2 py-1.5 transition-colors hover:bg-amber-100 dark:bg-amber-950/10 dark:hover:bg-amber-950/30">
        <span className="size-1.5 shrink-0 rounded-sm bg-muted-foreground/50" aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words text-sm">{risk.description}</span>
        <RiskSeverityBadge severity={risk.severity} editable={false} />
      </li>)}</ul>
      {!scope.risks.length && <p className="text-sm text-muted-foreground">No risks logged.</p>}
    </Panel>
  </div>;
}
export function ScopeModule({ opportunity: o, onSaved, readOnly }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void; readOnly: boolean }) {
  const service = useOpportunityService(), mutation = useSave();
  const [draft, setDraft] = useState<Scope>(o.scope ?? emptyScope), [baseline, setBaseline] = useState(JSON.stringify(o.scope ?? emptyScope));
  const [newAlignment, setNewAlignment] = useState(''), [newRisk, setNewRisk] = useState<{ description: string; severity: RiskSeverity }>({ description: '', severity: 'HIGH' });
  const [validation, setValidation] = useState<string>();
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'risk' | 'alignment'; id: string; label: string } | null>(null);
  // Brief "Updated" badge confirming an inline edit was registered — fades on its own rather than needing a dismissal.
  function flagUpdated(id: string) {
    setRecentlyUpdated(prev => new Set(prev).add(id));
    setTimeout(() => setRecentlyUpdated(prev => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; }), 3000);
  }
  const baselineScope = JSON.parse(baseline) as Scope;
  const editable = !readOnly && isPreparing(o) && o.allowedActions.includes('EDIT_SCOPE');
  const dirty = JSON.stringify(draft) !== baseline;
  useUnsaved(dirty);
  const riskSeverityBreakdown = RISK_SEVERITY_OPTIONS.map(option => ({ key: option.id, label: option.label, value: draft.risks.filter(item => item.severity === option.id).length, color: SEVERITY_COLOR[option.id as RiskSeverity] }));

  // Risks and Alignment persist immediately on add/remove/severity-change — unlike the free-form
  // Scope summary textarea, there is no natural "done typing" moment to batch these list edits
  // behind a manual Save button. `next` is built explicitly (not read back from `draft` after
  // setDraft) since state updates are not synchronous.
  async function persist(next: Scope, label: string) {
    setDraft(next);
    if (!editable) return;
    if (!next.summary.trim()) { setValidation('Enter the project scope before saving.'); return; }
    if (next.alignment.some(item => !item.text.trim())) { setValidation('Remove any empty alignment items before saving.'); return; }
    if (next.risks.some(item => !item.description.trim())) { setValidation('Remove any empty risks before saving.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ scope: next, revision: o.revision }), key => service.saveScope({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, scope: next }), value => { if (value.scope) { setDraft(value.scope); setBaseline(JSON.stringify(value.scope)); } onSaved(value); }, label);
  }
  function addAlignment() {
    const text = newAlignment.trim(); if (!text) return;
    setNewAlignment('');
    void persist({ ...draft, alignment: [...draft.alignment, { id: `draft-${randomUUID()}`, text }] }, 'Alignment item added.');
  }
  function removeAlignment(id: string) { void persist({ ...draft, alignment: draft.alignment.filter(item => item.id !== id) }, 'Alignment item removed.'); }
  function addRisk() {
    const description = newRisk.description.trim(); if (!description) return;
    setNewRisk({ description: '', severity: 'HIGH' });
    void persist({ ...draft, risks: [...draft.risks, { id: `draft-${randomUUID()}`, description, severity: newRisk.severity }] }, 'Risk added.');
  }
  function removeRisk(id: string) { void persist({ ...draft, risks: draft.risks.filter(item => item.id !== id) }, 'Risk removed.'); }
  function updateRiskSeverity(id: string, severity: RiskSeverity) { void persist({ ...draft, risks: draft.risks.map(item => item.id === id ? { ...item, severity } : item) }, 'Risk severity updated.'); }
  function updateRiskDescription(id: string, description: string) { flagUpdated(id); void persist({ ...draft, risks: draft.risks.map(item => item.id === id ? { ...item, description } : item) }, 'Risk updated.'); }
  function updateAlignmentText(id: string, text: string) { flagUpdated(id); void persist({ ...draft, alignment: draft.alignment.map(item => item.id === id ? { ...item, text } : item) }, 'Alignment item updated.'); }
  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'risk') removeRisk(pendingDelete.id); else removeAlignment(pendingDelete.id);
    setPendingDelete(null);
  }

  return <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-3">
      <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon headerRight={<span className="text-xs font-semibold text-amber-600">Required</span>}>
        <Textarea aria-label="Scope summary" rows={6} value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} disabled={!editable || mutation.saving} placeholder="Describe the project scope…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{draft.summary.length} characters</span>
          {editable && <div className="flex items-center gap-3">{draft.summary !== baselineScope.summary && <span className="text-xs text-amber-600">Unsaved changes</span>}<Button type="button" size="sm" disabled={mutation.saving || draft.summary === baselineScope.summary} onClick={() => void persist(draft, 'Scope saved.')}>Save scope</Button></div>}
        </div>
      </Panel>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Panel title="Alignment" tone="teal" icon={CheckCircle2} accentIcon headerRight={<span className="text-xs text-muted-foreground">{draft.alignment.length} item{draft.alignment.length === 1 ? '' : 's'}</span>}>
          <ul className="space-y-1">{draft.alignment.map(item => <li key={item.id} className="flex items-center gap-2 rounded-md bg-teal-50/70 px-2 py-1.5 transition-colors hover:bg-teal-100 dark:bg-teal-950/10 dark:hover:bg-teal-950/30"><span className="size-1.5 shrink-0 rounded-sm bg-teal-500" aria-hidden="true" /><InlineEditableText value={item.text} editable={editable} disabled={mutation.saving} ariaLabel={`Edit alignment item: ${item.text}`} onCommit={text => updateAlignmentText(item.id, text)} />{recentlyUpdated.has(item.id) && <Badge variant="info" size="sm" className="shrink-0">Updated</Badge>}{editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.text || 'alignment item'}`} disabled={mutation.saving} onClick={() => setPendingDelete({ kind: 'alignment', id: item.id, label: item.text || 'this alignment item' })}><X className="size-4" /></Button>}</li>)}</ul>
          {!draft.alignment.length && <p className="text-sm text-muted-foreground">No alignment items yet.</p>}
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add alignment item" placeholder="Add alignment item (e.g. tech stack, standard, pricing model)" value={newAlignment} onChange={e => setNewAlignment(e.target.value)} disabled={mutation.saving} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlignment(); } }} /><Button type="button" variant="outline" disabled={mutation.saving || !newAlignment.trim()} onClick={addAlignment}>Add</Button></div>}
        </Panel>
        <Panel title="Risks" tone="amber" icon={AlertTriangle} accentIcon headerRight={<span className="text-xs text-muted-foreground">{draft.risks.length} item{draft.risks.length === 1 ? '' : 's'}</span>}>
          <ul className="space-y-1">{draft.risks.map(risk => <li key={risk.id} className="flex items-center gap-2 rounded-md bg-amber-50/70 px-2 py-1.5 transition-colors hover:bg-amber-100 dark:bg-amber-950/10 dark:hover:bg-amber-950/30">
            <span className="size-1.5 shrink-0 rounded-sm bg-muted-foreground/50" aria-hidden="true" />
            <InlineEditableText value={risk.description} editable={editable} disabled={mutation.saving} ariaLabel={`Edit risk: ${risk.description}`} onCommit={text => updateRiskDescription(risk.id, text)} />
            {recentlyUpdated.has(risk.id) && <Badge variant="info" size="sm" className="shrink-0">Updated</Badge>}
            <RiskSeverityBadge severity={risk.severity} editable={editable} disabled={mutation.saving} onChange={severity => updateRiskSeverity(risk.id, severity)} />
            {editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${risk.description || 'risk'}`} disabled={mutation.saving} onClick={() => setPendingDelete({ kind: 'risk', id: risk.id, label: risk.description || 'this risk' })}><X className="size-4" /></Button>}
          </li>)}</ul>
          {!draft.risks.length && <p className="text-sm text-muted-foreground">No risks logged yet.</p>}
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add risk" placeholder="Add risk…" value={newRisk.description} onChange={e => setNewRisk(r => ({ ...r, description: e.target.value }))} disabled={mutation.saving} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRisk(); } }} /><SeveritySelect label="New risk severity" value={newRisk.severity} onChange={severity => setNewRisk(r => ({ ...r, severity }))} disabled={mutation.saving} /><Button type="button" variant="outline" disabled={mutation.saving || !newRisk.description.trim()} onClick={addRisk}>Add</Button></div>}
        </Panel>
      </div>
      <ConfirmRemoveDialog open={pendingDelete !== null} label={pendingDelete?.label ?? ''} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
      {(validation || mutation.error) && <Notice error={validation ?? mutation.error!} />}
    </div>
    <aside className="space-y-3" aria-label="Assessment summary">
      <Panel title="Assessment summary" tone="indigo" accentIcon className="bg-emerald-50/40">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-center dark:border-teal-900 dark:bg-teal-950/10">
              <strong className="block text-3xl text-teal-700 dark:text-teal-300">{draft.alignment.length}</strong>
              <p className="text-xs text-muted-foreground">Alignment</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-center dark:border-amber-900 dark:bg-amber-950/10">
              <strong className="block text-3xl text-amber-700 dark:text-amber-300">{draft.risks.length}</strong>
              <p className="text-xs text-muted-foreground">Risks</p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Risks by severity</p>
            <DonutChart centerLabel="Risks" emptyLabel="No risks logged yet" data={riskSeverityBreakdown} />
            <DonutChartLegend className="mt-3" data={riskSeverityBreakdown} />
          </div>
        </div>
      </Panel>
    </aside>
  </div>;
}
