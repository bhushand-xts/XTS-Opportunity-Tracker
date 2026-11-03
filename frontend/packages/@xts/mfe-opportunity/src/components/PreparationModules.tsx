import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DonutChart,
  DonutChartLegend,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useAuth,
} from '@xts/design-system';
import type {
  AssessmentSection,
  Currency,
  Estimation,
  EstimationGrid,
  EstimationVersion,
  EstimateRow,
  EstimationPhase,
  OpportunityDetail,
  RateMaster,
  RiskSeverity,
  Scope,
} from '@xts/api-contracts';
import { ReviewActions } from './ReviewActions';
import { toast } from 'sonner';
import { estimationSubmissionError } from '../lib/estimationValidation';
import { SavedEstimationVersions } from './SavedEstimationVersions';
import { EstimationMatrix } from './EstimationMatrix';
import { EstimationRateMaster } from './EstimationRateMaster';
import { EstimationRoleDialog } from './EstimationRoleDialog';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { randomUUID } from '../lib/uuid';
import { useUnsaved } from '../hooks/useUnsaved';
import { estimateTotal, isPreparationLocked, isPreparing, money, RISK_SEVERITY_OPTIONS } from '../lib/workflow';
import { Field, Notice, Panel, Values } from './ui';
import { CREATE_ESTIMATION_PHASE, GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';

const RATE_MASTER_MENU_KEY = 'technical_roles_and_rate_master';
const ESTIMATE_PHASE_MENU_KEY = 'estimate_phase_master';
// The backend's EstimateRow only has hours/people/hourlyRate — no phase, role, duration or
// resource-allocation fields. The grid below persists Duration-in-weeks × Resource-allocation
// as an equivalent hours/hourlyRate pair (at a standard 40-hour week) so the existing
// rowAmount/estimateTotal math and the real saveOpportunityEstimation mutation keep working
// unchanged. The one limit this creates: reloading a saved estimate recovers the correct
// Person-week (and cost) per phase/role, but not the original separate Duration and Resource
// allocation values that produced it — only their product was ever persisted.
const HOURS_PER_WEEK = 40;
function gridRowId(phaseId: number, roleCode: string) { return `grid-${phaseId}-${roleCode}`; }
function cellKey(phaseId: number, roleCode: string) { return `${phaseId}:${roleCode}`; }
function estimationGrid(phaseIds: Set<number>, roleCodes: Set<string>, duration: Record<number, string>, allocation: Record<string, string>): EstimationGrid {
  const phases = [...phaseIds].sort((a, b) => a - b), roles = [...roleCodes].sort();
  return {
    phaseIds: phases, roleCodes: roles,
    durations: phases.map(phaseId => ({ phaseId, weeks: duration[phaseId] ?? '' })),
    allocations: phases.flatMap(phaseId => roles.map(roleCode => ({ phaseId, roleCode, effort: allocation[cellKey(phaseId, roleCode)] ?? '' }))),
  };
}
function trimDecimal(value: number) { return String(Math.round(value * 100) / 100); }
/** Rates already stored as "Monthly" are used as-is; any other rateType is treated as a weekly
 * figure, consistent with the formula's own 20-working-days-a-month / 5-day-week convention
 * (4 weeks per month) rather than a calendar average. */
function monthlyRate(role: RateMaster): number {
  return role.rateType.trim().toLowerCase() === 'monthly' ? role.defaultRate : role.defaultRate * 4;
}

/** Searchable multi-select that keeps the existing menu and checkbox behavior. */
function MultiSelectField({ label, options, selected, onToggle, onSelectAll, onClear, disabled, addControl }: {
  label: string; options: { id: string; label: string; description?: string; searchText?: string }[]; selected: Set<string>;
  onToggle: (id: string) => void; onSelectAll: () => void; onClear: () => void; disabled?: boolean; addControl?: ReactNode;
}) {
  const triggerId = useId();
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  function changeOpen(next: boolean) { setOpen(next); if (!next) setSearch(''); }
  const visible = options.filter(option => `${option.label} ${option.description ?? ''} ${option.searchText ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const summary = !selected.size ? `Select ${label.toLowerCase()}…` : selected.size === options.length && options.length > 0 ? `All ${label.toLowerCase()} (${selected.size})` : `${selected.size} selected`;
  return <div className="opp-field min-w-0 space-y-1">
    <Label htmlFor={triggerId}>{label}</Label>
    <DropdownMenu open={open} onOpenChange={changeOpen}>
      <DropdownMenuTrigger asChild><Button id={triggerId} type="button" variant="outline" aria-label={summary} className="w-full justify-between bg-background font-normal" disabled={disabled}><span className="truncate">{summary}</span><ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="flex max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 max-w-[calc(100vw-32px)] flex-col overflow-hidden p-1">
        <div className="shrink-0 space-y-2 p-2">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{label}</span><div className="flex items-center gap-2"><Badge variant="muted" size="sm">{selected.size} selected</Badge><Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground" aria-label={`Close ${label.toLowerCase()} dropdown`} onClick={() => changeOpen(false)}><X className="size-3.5" aria-hidden="true" /></Button></div></div>
          <InputGroup className="rounded-lg border-transparent bg-muted/60 shadow-none focus-within:border-primary/40 focus-within:bg-background">
            <InputGroupAddon><Search className="size-4 text-primary" aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput id={searchId} aria-label={`Search ${label.toLowerCase()}`} placeholder={`Find ${label.toLowerCase()}…`} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key !== 'Escape') event.stopPropagation(); }} className="h-9 text-sm" />
            {search && <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label={`Clear ${label.toLowerCase()} search`} onClick={() => { setSearch(''); document.getElementById(searchId)?.focus(); }}><X className="size-3" aria-hidden="true" /></InputGroupButton></InputGroupAddon>}
          </InputGroup>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50" disabled={!options.length} onClick={onSelectAll}>Select all</button>
            <button type="button" className="text-xs font-medium text-muted-foreground hover:underline disabled:pointer-events-none disabled:opacity-50" disabled={!selected.size} onClick={onClear}>Clear selection</button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="min-h-0 max-h-60 flex-1 overflow-y-auto">
          {visible.map(option => <DropdownMenuCheckboxItem key={option.id} indicatorVariant="boxed" textValue={option.label} checked={selected.has(option.id)} className="min-h-9 py-2 data-[state=checked]:bg-primary/5" onSelect={event => event.preventDefault()} onCheckedChange={() => onToggle(option.id)}><span className="min-w-0"><span className="block break-words" title={option.searchText}>{option.label}</span>{option.description && <span className="block text-xs text-muted-foreground">{option.description}</span>}</span></DropdownMenuCheckboxItem>)}
          {!visible.length && <p className="px-3 py-4 text-center text-xs text-muted-foreground">{options.length ? 'No matching options.' : 'Nothing configured yet.'}</p>}
        </div>
        {addControl && <div className="shrink-0 border-t pt-1">{addControl}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function EstimationModule({
  opportunity: o,
  onSaved,
  readOnly,
  showActions = true,
  registerDraft,
  sidebarTarget,
  selectedVersion: controlledVersion,
  onSelectVersion,
}: {
  opportunity: OpportunityDetail;
  onSaved: (value: OpportunityDetail) => void;
  readOnly: boolean;
  showActions?: boolean;
  sidebarTarget?: HTMLElement | null;
  selectedVersion?: EstimationVersion | null;
  onSelectVersion?: (version: EstimationVersion | null) => void;
  registerDraft?: (reader: (() => Estimation) | null) => void;
}) {
  const service = useOpportunityService();
  const [localVersion, setLocalVersion] = useState<EstimationVersion | null>(null);
  const selectedVersion = controlledVersion === undefined ? localVersion : controlledVersion;
  function selectVersion(version: EstimationVersion | null) { setLocalVersion(version); onSelectVersion?.(version); }
  const mutation = useSave();
  const auth = useAuth();

  const { data: masters } = useQuery<{
    estimationPhasesList: (EstimationPhase | null)[] | null;
    rateMasters: (RateMaster | null)[] | null;
    currencies: (Currency | null)[] | null;
  }>(GET_ESTIMATION_MASTERS, {
    fetchPolicy: 'network-only',
  });

  const phases = (masters?.estimationPhasesList ?? [])
    .filter((p): p is EstimationPhase => Boolean(p?.isActive))
    .sort(
      (a, b) =>
        (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) ||
        a.phaseName.localeCompare(b.phaseName),
    );

  const roles = (masters?.rateMasters ?? [])
    .filter((r): r is RateMaster => Boolean(r?.isActive))
    .sort((a, b) => a.roleName.localeCompare(b.roleName));

  const currencies = (masters?.currencies ?? []).filter(
    (c): c is Currency => c != null,
  );

  const canViewRates = auth.hasPermission(RATE_MASTER_MENU_KEY, 'view');
  const canAddPhase = auth.hasPermission(ESTIMATE_PHASE_MENU_KEY, 'add');
  const canAddRole = auth.hasPermission(RATE_MASTER_MENU_KEY, 'add');
  const [addingRole, setAddingRole] = useState(false);

  const [createPhase, { loading: addingPhase }] = useMutation<{ createEstimationPhase: EstimationPhase }>(CREATE_ESTIMATION_PHASE, {
    refetchQueries: [{ query: GET_ESTIMATION_MASTERS }],
  });
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const phaseNameId = useId();
  const [newPhaseName, setNewPhaseName] = useState('');
  const [addPhaseError, setAddPhaseError] = useState<string>();

  const initialEstimation = o.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0.00' };
  const [draft, setDraft] = useState<Estimation>(initialEstimation);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [validation, setValidation] = useState<string>();
  const estimationStep = o.stageId == null ? isPreparing(o) :
    o.stageId === 3 && o.subStageId === 7;
  const editable = !readOnly && estimationStep && o.allowedActions.includes('EDIT_ESTIMATION');

  const [selectedPhaseIds, setSelectedPhaseIds] = useState<Set<number>>(new Set());
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<Record<number, string>>({});
  const [allocation, setAllocation] = useState<Record<string, string>>({});
  const seededRef = useRef(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const validationId = useId();

  // Seed once after the masters query completes, including an empty master list.
  // Creating a first role later must not reset phase selections or unsaved matrix values.
  useEffect(() => {
    if (seededRef.current || !masters) return;
    seededRef.current = true;
    const savedRows = o.estimation?.rows ?? [];
    const nextPhaseIds = new Set<number>(), nextRoleCodes = new Set<string>();
    const nextDuration: Record<number, string> = {}, nextAllocation: Record<string, string> = {};
    if (o.estimation?.grid) {
      const grid = o.estimation.grid;
      grid.phaseIds.forEach(id => nextPhaseIds.add(id));
      grid.roleCodes.forEach(code => nextRoleCodes.add(code));
      grid.durations.forEach(item => { nextDuration[item.phaseId] = item.weeks; });
      grid.allocations.forEach(item => { nextAllocation[cellKey(item.phaseId, item.roleCode)] = item.effort; });
    } else for (const phase of phases) {
      let used = false;
      for (const role of roles) {
        const row = savedRows.find(r => r.id === gridRowId(phase.id, role.roleCode));
        const weeks = row ? Number(row.hours) / HOURS_PER_WEEK : 0;
        if (row && weeks > 0) { used = true; nextRoleCodes.add(role.roleCode); nextAllocation[cellKey(phase.id, role.roleCode)] = trimDecimal(weeks); }
      }
      if (used) { nextPhaseIds.add(phase.id); nextDuration[phase.id] = '1'; }
    }
    setSelectedPhaseIds(nextPhaseIds); setSelectedRoleCodes(nextRoleCodes); setDuration(nextDuration); setAllocation(nextAllocation);
    setBaseline(JSON.stringify({ assumptions: initialEstimation.assumptions, grid: estimationGrid(nextPhaseIds, nextRoleCodes, nextDuration, nextAllocation) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally seeds once from the loaded masters, not on every draft/row change
  }, [masters, phases.length, roles.length]);

  const activePhases = phases.filter(p => selectedPhaseIds.has(p.id));
  const activeRoles = roles.filter(r => selectedRoleCodes.has(r.roleCode));
  const durationError = (phaseId: number) => {
    const value = duration[phaseId] ?? '';
    return submissionAttempted && (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0) ? 'Enter weeks greater than 0.' : undefined;
  };
  const effortError = (phaseId: number, roleCode: string) => {
    const value = allocation[cellKey(phaseId, roleCode)] ?? '';
    return submissionAttempted && (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0) ? 'Enter effort (0 if unused).' : undefined;
  };
  const rateError = (role: RateMaster) => submissionAttempted && activePhases.some(phase => Number(allocation[cellKey(phase.id, role.roleCode)]) > 0) && (!Number.isFinite(monthlyRate(role)) || monthlyRate(role) <= 0);


  // Person-week = Duration (weeks) × Resource allocation.
  function personWeek(phaseId: number, roleCode: string): number {
    const d = Number(duration[phaseId] ?? ''), a = Number(allocation[cellKey(phaseId, roleCode)] ?? '');
    return Number.isFinite(d) && Number.isFinite(a) && d > 0 && a > 0 ? d * a : 0;
  }
  // Cost = (Monthly rate ÷ 20) × (Person-week × 5).
  function cellCost(phaseId: number, roleCode: string, role: RateMaster): number {
    if (!editable) { const row = draft.rows.find(item => item.id === gridRowId(phaseId, roleCode)); return row ? Number(row.hours) * row.people * Number(row.hourlyRate) : 0; }
    return (monthlyRate(role) / 20) * (personWeek(phaseId, roleCode) * 5);
  }
  const effortTotal = activePhases.reduce((sum, p) => sum + activeRoles.reduce((s, r) => s + personWeek(p.id, r.roleCode), 0), 0);

  // Rows saved before this redesign (free-form, not tied to any phase/role) are carried through
  // unedited rather than silently dropped — matched against every phase×role combination the
  // masters currently know about, not just the ones selected right now.
  const gridIdsAll = new Set(phases.flatMap(p => roles.map(r => gridRowId(p.id, r.roleCode))));
  const legacyRows = draft.rows.filter(r => !gridIdsAll.has(r.id));

  const gridRows: EstimateRow[] = [];
  for (const phase of activePhases) for (const role of activeRoles) {
    const weeks = personWeek(phase.id, role.roleCode);
    if (weeks <= 0) continue;
    gridRows.push({
      id: gridRowId(phase.id, role.roleCode),
      workItem: `${phase.phaseName} — ${role.roleName}`,
      hours: trimDecimal(weeks * HOURS_PER_WEEK),
      people: 1,
      hourlyRate: (monthlyRate(role) / (HOURS_PER_WEEK * 4)).toFixed(4),
    });
  }
  const rows = editable ? [...gridRows, ...legacyRows] : draft.rows;
  let total = '0.00', calculationError: string | undefined;
  try { total = estimateTotal(rows); } catch (error) { calculationError = error instanceof Error ? error.message : 'Check numeric fields.'; }
  const grid = estimationGrid(selectedPhaseIds, selectedRoleCodes, duration, allocation);
  // Loading/recalculating saved rows (rates, decimal formatting and row order)
  // is not a user edit. Compare only the editable inputs after seeding finishes.
  const dirty = editable && baseline !== null && JSON.stringify({ assumptions: draft.assumptions, grid }) !== baseline;
  useEffect(() => {
    registerDraft?.(() => {
      setSubmissionAttempted(true);
      if (!masters || mutation.saving) throw new Error('Wait for the estimate to finish loading or saving before submitting.');
      if (calculationError) throw new Error(calculationError);
      return { revision: draft.revision, rows, assumptions: draft.assumptions, total, grid };
    });
    return () => registerDraft?.(null);
  }, [registerDraft, masters, mutation.saving, calculationError, draft.revision, draft.assumptions, total, JSON.stringify(rows), JSON.stringify(grid)]);
  useUnsaved(dirty);

  function togglePhase(id: number) {
    setSelectedPhaseIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    setDuration(d => d[id] !== undefined ? d : { ...d, [id]: '1' });
  }
  function toggleRole(code: string) { setSelectedRoleCodes(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; }); }
  function selectAllPhases() {
    setSelectedPhaseIds(new Set(phases.map(p => p.id)));
    setDuration(d => { const next = { ...d }; for (const p of phases) if (next[p.id] === undefined) next[p.id] = '1'; return next; });
  }
  const clearPhases = () => setSelectedPhaseIds(new Set());
  const selectAllRoles = () => setSelectedRoleCodes(new Set(roles.map(r => r.roleCode)));
  const clearRoles = () => setSelectedRoleCodes(new Set());

  async function addPhase() {
    const name = newPhaseName.trim();
    if (!editable || !canAddPhase || addingPhase || !name) return;
    setAddPhaseError(undefined);
    try {
      const { data } = await createPhase({ variables: { input: { phaseName: name, isActive: true, createdBy: auth.session?.userId ? Number(auth.session.userId) : undefined } } });
      const created = data?.createEstimationPhase;
      if (!created) throw new Error('The phase was not created. Please retry.');
      setNewPhaseName('');
      setSelectedPhaseIds(prev => new Set(prev).add(created.id));
      setDuration(d => d[created.id] !== undefined ? d : { ...d, [created.id]: '1' });
      setPhaseDialogOpen(false);
      toast.success('Phase added.');
    } catch (error) {
      setAddPhaseError(error instanceof Error ? error.message : 'Failed to add the phase. Please retry.');
    }
  }

  async function saveNamedVersion(name: string, source?: EstimationVersion) {
    if (!editable || mutation.saving) return false;
    setSubmissionAttempted(true);
    const next: Estimation = { revision: draft.revision, rows, assumptions: draft.assumptions, total, grid };
    const error = calculationError ?? estimationSubmissionError(next);
    if (error) { toast.error(error); return false; }
    let succeeded = false;
    await mutation.run(JSON.stringify({ name, estimation: next, sourceVersionId: source?.id }), key => {
      if (!service.saveEstimationVersion) throw new Error('Saved versions are not available.');
      return service.saveEstimationVersion({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, name, estimation: next, sourceVersionId: source?.id });
    }, saved => {
      if (saved.opportunity.estimation) {
        const clearedDuration = Object.fromEntries([...selectedPhaseIds].map(id => [id, '1']));
        const clearedAllocation = Object.fromEntries([...selectedPhaseIds].flatMap(id => [...selectedRoleCodes].map(code => [cellKey(id, code), '0'])));
        const clearedGrid = estimationGrid(selectedPhaseIds, selectedRoleCodes, clearedDuration, clearedAllocation);
        setDuration(clearedDuration); setAllocation(clearedAllocation);
        setDraft({ ...saved.opportunity.estimation, rows: [], total: '0', grid: clearedGrid });
        setBaseline(JSON.stringify({ assumptions: saved.opportunity.estimation.assumptions, grid: clearedGrid }));
        setSubmissionAttempted(false);
        if (source && selectedVersion?.id === source.id) selectVersion(saved.version);
      }
      onSaved(saved.opportunity);
      succeeded = true;
    }, source ? 'Estimation updated as a new revision.' : 'Estimation version saved.');
    return succeeded;
  }
  async function deleteVersion(version: EstimationVersion) {
    if (!editable || mutation.saving) return false;
    let succeeded = false;
    await mutation.run(`delete-estimate-${version.id}`, async () => {
      if (!service.deleteEstimationVersion) throw new Error('Deleting saved estimates is not available.');
      await service.deleteEstimationVersion(o.id, version.id);
    }, () => {
      if (selectedVersion?.id === version.id) selectVersion(null);
      succeeded = true;
    }, 'Saved estimate deleted.');
    return succeeded;
  }
  function loadVersion(version: EstimationVersion) {
    if (!editable || mutation.saving) return false;
    const restored = version.estimation.grid;
    if (!restored || restored.phaseIds.some(id => !phases.some(phase => phase.id === id)) || restored.roleCodes.some(code => !roles.some(role => role.roleCode === code))) {
      toast.error('This version contains phases or roles that are no longer active. You can still view its historical snapshot.'); return false;
    }
    if (version.currencyCode !== o.currencyCode) { toast.error('This version uses a different currency. View its snapshot instead of loading it.'); return false; }
    setSelectedPhaseIds(new Set(restored.phaseIds)); setSelectedRoleCodes(new Set(restored.roleCodes));
    setDuration(Object.fromEntries(restored.durations.map(item => [item.phaseId, item.weeks])));
    setAllocation(Object.fromEntries(restored.allocations.map(item => [cellKey(item.phaseId, item.roleCode), item.effort])));
    setDraft(previous => ({ ...previous, rows: version.estimation.rows, assumptions: version.estimation.assumptions }));
    setSubmissionAttempted(false);
    toast.info('Estimate opened for editing using current master rates. Choose Update to save a new revision.');
    return true;
  }

  function onSubmitted(saved: OpportunityDetail) {
    const estimate = saved.estimation;
    if (estimate?.grid) {
      setDraft(estimate);
      setSelectedPhaseIds(new Set(estimate.grid.phaseIds)); setSelectedRoleCodes(new Set(estimate.grid.roleCodes));
      setDuration(Object.fromEntries(estimate.grid.durations.map(item => [item.phaseId, item.weeks])));
      setAllocation(Object.fromEntries(estimate.grid.allocations.map(item => [cellKey(item.phaseId, item.roleCode), item.effort])));
      setBaseline(JSON.stringify({ assumptions: estimate.assumptions, grid: estimate.grid }));
    }
    onSaved(saved);
  }

  return <div className="opp-estimation-workspace space-y-3">
    <Panel title="Select phases & technical roles" tone="indigo" icon={ClipboardList} accentIcon headerRight={estimationStep && draft.status === 'DRAFT' ? <Badge variant="muted">Draft</Badge> : undefined}>
      <div className="opp-estimation-controls grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
        <MultiSelectField label="Phases" options={phases.map(p => ({ id: String(p.id), label: p.phaseName }))} selected={new Set([...selectedPhaseIds].map(String))} onToggle={id => togglePhase(Number(id))} onSelectAll={selectAllPhases} onClear={clearPhases} disabled={!editable || mutation.saving}
          addControl={editable ? <>
            <DropdownMenuItem className="gap-2 font-medium text-primary" disabled={!canAddPhase} onSelect={() => { setAddPhaseError(undefined); setPhaseDialogOpen(true); }}><Plus className="size-4" aria-hidden="true" />Add phase</DropdownMenuItem>
            {!canAddPhase && <p className="px-2 py-1 text-xs text-muted-foreground">Phase Master Add permission is required.</p>}
          </> : undefined} />
        <MultiSelectField label="Technical roles" options={roles.map(role => ({ id: role.roleCode, label: role.roleCode, searchText: role.roleName, description: canViewRates ? `${money(trimDecimal(role.defaultRate), currencies.find(currency => currency.currencyId === role.currencyId)?.currencyCode ?? o.currencyCode)} / ${role.rateType}` : role.roleCode }))} selected={selectedRoleCodes} onToggle={toggleRole} onSelectAll={selectAllRoles} onClear={clearRoles} disabled={!editable || mutation.saving}
          addControl={editable && canAddRole ? <DropdownMenuItem className="gap-2 font-medium text-primary" onSelect={() => setAddingRole(true)}><Plus className="size-4" aria-hidden="true" />Add technical role</DropdownMenuItem> : undefined} />
        {canViewRates && <EstimationRateMaster roles={roles} currencies={currencies} currencyCode={o.currencyCode} />}

      </div>
    </Panel>
      <div className="space-y-3">
        <Panel title="Estimation matrix" tone="indigo">
          <EstimationMatrix phases={activePhases} roles={activeRoles} editable={editable} saving={mutation.saving} validationId={validationId} currencyCode={o.currencyCode}
            duration={id => duration[id] ?? (editable ? '' : '0')} allocation={(id, code) => allocation[cellKey(id, code)] ?? (editable ? '' : '0')}
            onDuration={(id, value) => setDuration(previous => ({ ...previous, [id]: value }))}
            onAllocation={(id, code, value) => setAllocation(previous => ({ ...previous, [cellKey(id, code)]: value }))}
            durationError={durationError} effortError={effortError} rateError={rateError} personWeek={personWeek} cellCost={cellCost}
            formatNumber={trimDecimal} effortTotal={effortTotal} total={total} calculationError={calculationError} />
        </Panel>
        {legacyRows.length > 0 && <p className="text-xs text-muted-foreground">{legacyRows.length} previously saved item{legacyRows.length === 1 ? '' : 's'} not tied to a phase/role {legacyRows.length === 1 ? 'is' : 'are'} preserved and included in the total, though no longer editable here.</p>}
        {(validation || calculationError) && <Notice error={validation ?? calculationError!} />}{mutation.error && <Notice error={mutation.error} />}
      </div>
    <SavedEstimationVersions sidebarTarget={sidebarTarget} opportunityId={o.id} revision={draft.revision} editable={editable} saving={mutation.saving} dirty={dirty} onSave={saveNamedVersion} onLoad={loadVersion} onDelete={deleteVersion} selectedVersion={selectedVersion} onSelectVersion={selectVersion}
      submitAction={showActions && o.allowedActions.includes('SUBMIT_ESTIMATE') ? <div className={sidebarTarget ? 'w-full [&_button]:!h-9 [&_button]:!min-h-9 [&_button]:!w-full [&_button]:!whitespace-normal' : 'shrink-0 [&_button]:!h-9 [&_button]:!min-h-9 [&_button]:!w-auto [&_button]:!whitespace-nowrap'}><ReviewActions opportunity={o} onSaved={onSubmitted} variant="toolbar" selectedVersion={mutation.saving ? null : selectedVersion} getEstimation={() => {
        setSubmissionAttempted(true);
        if (!masters || mutation.saving) throw new Error('Wait for the estimate to finish loading or saving before submitting.');
        if (calculationError) throw new Error(calculationError);
        return { revision: draft.revision, rows, assumptions: draft.assumptions, total, grid };
      }} /></div> : undefined} />
  <Dialog open={phaseDialogOpen && editable && canAddPhase} onOpenChange={open => { if (!addingPhase) setPhaseDialogOpen(open); }}>
    <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add phase</DialogTitle><DialogDescription>Add a phase to the shared Phase Master and select it for this estimate.</DialogDescription></DialogHeader>
      <form onSubmit={event => { event.preventDefault(); void addPhase(); }} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor={phaseNameId}>Phase name</Label><Input id={phaseNameId} aria-label="New phase name" autoFocus maxLength={100} required placeholder="e.g. Deployment & handover" value={newPhaseName} onChange={event => { setNewPhaseName(event.target.value); setAddPhaseError(undefined); }} disabled={addingPhase} aria-invalid={Boolean(addPhaseError)} aria-describedby={addPhaseError ? `${phaseNameId}-error` : undefined} /></div>
        {addPhaseError && <p id={`${phaseNameId}-error`} role="alert" className="text-sm text-destructive">{addPhaseError}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={addingPhase} onClick={() => setPhaseDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={addingPhase || !newPhaseName.trim()}>{addingPhase ? 'Adding phase...' : 'Add phase'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  {addingRole && editable && canAddRole && <EstimationRoleDialog open onOpenChange={setAddingRole} currencies={currencies.filter(currency => currency.isActive)} roles={masters?.rateMasters ?? []} defaultCurrencyId={currencies.find(currency => currency.currencyCode === o.currencyCode && currency.isActive)?.currencyId} onCreated={role => setSelectedRoleCodes(previous => new Set(previous).add(role.roleCode))} />}
  </div>;
}
const SEVERITY_BADGE: Record<RiskSeverity, 'success' | 'warning' | 'critical'> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'critical' };
const SEVERITY_COLOR: Record<RiskSeverity, string> = { LOW: '#089b6a', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const emptyScope: Scope = { revision: 0, summary: '', alignment: [], risks: [] };
const normalizeAssessmentText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
/** Mirrors the backend rule: matching ignores case and extra spaces. `exceptId` skips the item being edited. */
function isListedDuplicate(items: { id: string; text: string }[], text: string, exceptId?: string) {
  const normalized = normalizeAssessmentText(text);
  return Boolean(normalized) && items.some(item => item.id !== exceptId && normalizeAssessmentText(item.text) === normalized);
}

function DuplicateHint({ id, kind }: { id: string; kind: 'risk' | 'alignment item' }) {
  return <div id={id} role="alert" className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p><strong className="font-medium">This {kind} is already listed.</strong> Enter a different {kind} or edit the existing one.</p>
  </div>;
}

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
function ConfirmRemoveDialog({ open, label, onCancel, onConfirm, title = 'Remove this item?', description }: { open: boolean; label: string; onCancel: () => void; onConfirm: () => void; title?: string; description?: string }) {
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description ?? `“${label}” will be removed from the scope. This can't be undone.`}</AlertDialogDescription>
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
  // Duplicates are caught here, before saving, so the user gets an inline hint next to the
  // input instead of a server error. `rejectedEdit` marks a list whose inline edit was refused.
  const [rejectedEdit, setRejectedEdit] = useState<'RISKS' | 'ALIGNMENT'>();
  const [scopeMissing, setScopeMissing] = useState(false), [confirmScopeRemoval, setConfirmScopeRemoval] = useState(false);
  const riskHintId = useId(), alignmentHintId = useId(), scopeHintId = useId();
  const riskItems = draft.risks.map(item => ({ id: item.id, text: item.description }));
  const newRiskDuplicate = isListedDuplicate(riskItems, newRisk.description);
  const newAlignmentDuplicate = isListedDuplicate(draft.alignment, newAlignment);
  const showRiskHint = newRiskDuplicate || rejectedEdit === 'RISKS';
  const showAlignmentHint = newAlignmentDuplicate || rejectedEdit === 'ALIGNMENT';
  // Show a brief "Updated" badge after an inline edit.
  function flagUpdated(id: string) {
    setRecentlyUpdated(prev => new Set(prev).add(id));
    setTimeout(() => setRecentlyUpdated(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    }), 3000);
  }
  const baselineScope = JSON.parse(baseline) as Scope;
  const risksChanged = JSON.stringify(draft.risks) !== JSON.stringify(baselineScope.risks);
  const alignmentChanged = JSON.stringify(draft.alignment) !== JSON.stringify(baselineScope.alignment);
  const removingScope = Boolean(baselineScope.summary.trim()) && !draft.summary.trim();
  const preparationLocked = isPreparationLocked(o);
  const editable = !readOnly && !preparationLocked && o.allowedActions.includes('EDIT_SCOPE');
  const dirty = editable && (JSON.stringify(draft) !== baseline || Boolean(newRisk.description.trim() || newAlignment.trim()));
  useEffect(() => {
    if (!preparationLocked) return;
    setDraft(o.scope ?? emptyScope);
    setBaseline(JSON.stringify(o.scope ?? emptyScope));
    setNewAlignment('');
    setNewRisk({ description: '', severity: 'HIGH' });
    setPendingDelete(null);
  }, [preparationLocked, o.scope]);
  useUnsaved(dirty);
  const riskSeverityBreakdown = RISK_SEVERITY_OPTIONS.map(option => ({ key: option.id, label: option.label, value: draft.risks.filter(item => item.severity === option.id).length, color: SEVERITY_COLOR[option.id as RiskSeverity] }));

  // Risks and Alignment persist immediately on add/remove/severity-change — unlike the free-form
  // Scope summary textarea, there is no natural "done typing" moment to batch these list edits
  // behind a manual Save button. `next` is built explicitly (not read back from `draft` after
  // setDraft) since state updates are not synchronous.
  async function persist(next: Scope, label: string, requireSummary = false) {
    setDraft(next);
    if (!editable) return;
    // Only the explicit "Save scope" action enforces the required summary — Alignment and Risks
    // are saved independently (add/remove/edit) and shouldn't be blocked by an unrelated, unsaved
    // summary draft.
    // Clearing a previously saved scope is an explicit, confirmed removal; only a scope that
    // was never saved is required here.
    if (requireSummary && !next.summary.trim() && !removingScope) { setScopeMissing(true); return; }
    if (next.alignment.some(item => !item.text.trim())) { setValidation('Remove any empty alignment items before saving.'); return; }
    if (next.risks.some(item => !item.description.trim())) { setValidation('Remove any empty risks before saving.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ scope: next, revision: o.revision }), key => service.saveScope({ opportunityId: o.id, expectedRevision: o.revision, idempotencyKey: key, scope: next }), value => { if (value.scope) { setDraft(value.scope); setBaseline(JSON.stringify(value.scope)); } onSaved(value); }, label);
  }
  function addAlignment() {
    const text = newAlignment.trim(); if (!text || newAlignmentDuplicate) return;
    setNewAlignment('');
    void persist({ ...draft, alignment: [...draft.alignment, { id: `draft-${randomUUID()}`, text }] }, 'Alignment item added.');
  }
  function removeAlignment(id: string) { void persist({ ...draft, alignment: draft.alignment.filter(item => item.id !== id) }, 'Alignment item removed.'); }
  function addRisk() {
    const description = newRisk.description.trim(); if (!description || newRiskDuplicate) return;
    setNewRisk({ description: '', severity: 'HIGH' });
    void persist({ ...draft, risks: [...draft.risks, { id: `draft-${randomUUID()}`, description, severity: newRisk.severity }] }, 'Risk added.');
  }
  function removeRisk(id: string) { void persist({ ...draft, risks: draft.risks.filter(item => item.id !== id) }, 'Risk removed.'); }
  function updateRiskSeverity(id: string, severity: RiskSeverity) { void persist({ ...draft, risks: draft.risks.map(item => item.id === id ? { ...item, severity } : item) }, 'Risk severity updated.'); }
  function updateRiskDescription(id: string, description: string) {
    if (isListedDuplicate(riskItems, description, id)) { setRejectedEdit('RISKS'); return; }
    setRejectedEdit(undefined); flagUpdated(id); void persist({ ...draft, risks: draft.risks.map(item => item.id === id ? { ...item, description } : item) }, 'Risk updated.'); }
  function updateAlignmentText(id: string, text: string) {
    if (isListedDuplicate(draft.alignment, text, id)) { setRejectedEdit('ALIGNMENT'); return; }
    setRejectedEdit(undefined); flagUpdated(id); void persist({ ...draft, alignment: draft.alignment.map(item => item.id === id ? { ...item, text } : item) }, 'Alignment item updated.'); }
  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'risk') removeRisk(pendingDelete.id); else removeAlignment(pendingDelete.id);
    setPendingDelete(null);
  }

  return <div className="opp-assessment-layout grid grid-cols-1 items-start gap-3">
    <div className="opp-assessment-editors space-y-3">
      {preparationLocked && <p role="status" className="opp-notice">Scope &amp; Assessment is read-only at this workflow stage.</p>}
      <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon headerRight={<span className={cn('text-xs font-semibold', preparationLocked ? 'text-muted-foreground' : 'text-amber-600')}>{preparationLocked ? 'Read only' : 'Required'}</span>}>
        <Textarea aria-label="Scope summary" rows={4} value={draft.summary} onChange={e => { setDraft(d => ({ ...d, summary: e.target.value })); setScopeMissing(false); }} disabled={!editable || mutation.saving} placeholder="Describe the project scope…" aria-invalid={scopeMissing} aria-describedby={scopeMissing ? scopeHintId : undefined} className={cn(scopeMissing && 'border-amber-400 focus-visible:ring-amber-300')} />
        {editable && scopeMissing && <div id={scopeHintId} role="alert" className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p><strong className="font-medium">Scope is required.</strong> Describe the project scope before saving.</p>
        </div>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{draft.summary.length} characters</span>
          {editable && <div className="flex items-center gap-3">{draft.summary !== baselineScope.summary && <span className="text-xs text-amber-600">{removingScope ? 'Saved scope will be removed' : 'Unsaved changes'}</span>}{removingScope
            ? <Button type="button" size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5" disabled={mutation.saving} onClick={() => setConfirmScopeRemoval(true)}>Remove scope</Button>
            : <Button type="button" size="sm" disabled={mutation.saving || draft.summary === baselineScope.summary && Boolean(baselineScope.summary.trim())} onClick={() => void persist(draft, 'Scope saved.', true)}>Save scope</Button>}</div>}
        </div>
      </Panel>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Panel title="Alignment" tone="teal" icon={CheckCircle2} accentIcon headerRight={<span className="text-xs text-muted-foreground">{draft.alignment.length} item{draft.alignment.length === 1 ? '' : 's'}</span>}>
          <ul className="space-y-1">{draft.alignment.map(item => <li key={item.id} className="flex items-center gap-2 rounded-md bg-teal-50/70 px-2 py-1.5 transition-colors hover:bg-teal-100 dark:bg-teal-950/10 dark:hover:bg-teal-950/30"><span className="size-1.5 shrink-0 rounded-sm bg-teal-500" aria-hidden="true" /><InlineEditableText value={item.text} editable={editable} disabled={mutation.saving} ariaLabel={`Edit alignment item: ${item.text}`} onCommit={text => updateAlignmentText(item.id, text)} />{recentlyUpdated.has(item.id) && <Badge variant="info" size="sm" className="shrink-0">Updated</Badge>}{editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.text || 'alignment item'}`} disabled={mutation.saving} onClick={() => setPendingDelete({ kind: 'alignment', id: item.id, label: item.text || 'this alignment item' })}><X className="size-4" /></Button>}</li>)}</ul>
          {!draft.alignment.length && <p className="text-sm text-muted-foreground">No alignment items yet.</p>}
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add alignment item" placeholder="Add alignment item (e.g. tech stack, standard, pricing model)" value={newAlignment} onChange={e => { setNewAlignment(e.target.value); setRejectedEdit(undefined); }} disabled={mutation.saving} aria-invalid={newAlignmentDuplicate} aria-describedby={showAlignmentHint ? alignmentHintId : undefined} className={cn(newAlignmentDuplicate && 'border-amber-400 focus-visible:ring-amber-300')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlignment(); } }} /><Button type="button" variant="outline" disabled={mutation.saving || !newAlignment.trim() || newAlignmentDuplicate} onClick={addAlignment}>Add</Button></div>}
          {editable && showAlignmentHint && <DuplicateHint id={alignmentHintId} kind="alignment item" />}
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
          {editable && <div className="mt-3 flex gap-2"><Input aria-label="Add risk" placeholder="Add risk…" value={newRisk.description} onChange={e => { setNewRisk(r => ({ ...r, description: e.target.value })); setRejectedEdit(undefined); }} disabled={mutation.saving} aria-invalid={newRiskDuplicate} aria-describedby={showRiskHint ? riskHintId : undefined} className={cn(newRiskDuplicate && 'border-amber-400 focus-visible:ring-amber-300')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRisk(); } }} /><SeveritySelect label="New risk severity" value={newRisk.severity} onChange={severity => setNewRisk(r => ({ ...r, severity }))} disabled={mutation.saving} /><Button type="button" variant="outline" disabled={mutation.saving || !newRisk.description.trim() || newRiskDuplicate} onClick={addRisk}>Add</Button></div>}
          {editable && showRiskHint && <DuplicateHint id={riskHintId} kind="risk" />}
        </Panel>
      </div>
      <ConfirmRemoveDialog open={pendingDelete !== null} label={pendingDelete?.label ?? ''} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
      <ConfirmRemoveDialog open={confirmScopeRemoval} label="" title="Remove the project scope?" description="The saved scope will be removed from this opportunity. Alignment and risks are not affected." onCancel={() => setConfirmScopeRemoval(false)} onConfirm={() => { setConfirmScopeRemoval(false); void persist(draft, 'Scope removed.', true); }} />
      {(validation || mutation.error) && <Notice error={validation ?? mutation.error!} />}
    </div>
    <aside className="opp-assessment-summary space-y-3" aria-label="Assessment summary">
      <Panel title="Assessment summary" tone="indigo" accentIcon className="bg-emerald-50/40">
        <div className="opp-assessment-summary-body">
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
          <div className="opp-assessment-chart border-t pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Risks by severity</p>
            <DonutChart centerLabel="Risks" emptyLabel="No risks logged yet" data={riskSeverityBreakdown} />
            <DonutChartLegend className="mt-3" data={riskSeverityBreakdown} />
          </div>
        </div>
      </Panel>
    </aside>
  </div>;
}
