import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Clock, Plus, Search, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Button, Card, cn, Input, SegmentedProgress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TooltipProvider, useSetPageTitle, type BadgeProps } from '@xts/design-system';
import type { ListFilter, OpportunitySummary, OpportunityState } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource, useDebounce } from '../hooks/useResource';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { Loading, Notice, OpportunityNumber, Status } from './ui';
import { money, STATE_LABELS, userLabel } from '../lib/workflow';
import { AccessUnavailable } from './AccessUnavailable';
import { isOpportunityOutcome, OPPORTUNITY_OUTCOME_LABEL, PIPELINE_STAGE_IDS, STAGE_LABELS } from '../lib/opportunityStatus';

const STAGES: OpportunityState[] = ['PREPARATION_PENDING', 'IN_PROGRESS', 'SALES_REVIEW', 'GATE1_PENDING', 'GATE1_GO', 'SALES_REJECTED', 'GATE1_NO_GO'];
// Workflow progress, coloured with the design system's --progress-* ramp (later steps read greener).
// Rejected / No-Go stop at the step where the decision was taken and use the destructive colour.
const PROGRESS_STEPS: OpportunityState[] = ['PREPARATION_PENDING', 'IN_PROGRESS', 'SALES_REVIEW', 'GATE1_PENDING', 'GATE1_GO'];
function progressStep(state: OpportunityState) { return state === 'SALES_REJECTED' ? 3 : state === 'GATE1_NO_GO' ? 4 : PROGRESS_STEPS.indexOf(state) + 1; }
// Full class names (not built from strings) so Tailwind can see them.
const STAGE_TONE: Record<OpportunityState, { top: string; edge: string; fill: string }> = {
  PREPARATION_PENDING: { top: 'border-t-progress-1', edge: 'border-l-progress-1', fill: 'bg-progress-1' },
  IN_PROGRESS: { top: 'border-t-progress-2', edge: 'border-l-progress-2', fill: 'bg-progress-2' },
  SALES_REVIEW: { top: 'border-t-progress-3', edge: 'border-l-progress-3', fill: 'bg-progress-3' },
  GATE1_PENDING: { top: 'border-t-progress-4', edge: 'border-l-progress-4', fill: 'bg-progress-4' },
  GATE1_GO: { top: 'border-t-progress-5', edge: 'border-l-progress-5', fill: 'bg-progress-5' },
  SALES_REJECTED: { top: 'border-t-destructive', edge: 'border-l-destructive', fill: 'bg-destructive' },
  GATE1_NO_GO: { top: 'border-t-destructive', edge: 'border-l-destructive', fill: 'bg-destructive' },
};
const PRIORITY: Record<string, { label: string; variant: BadgeProps['variant'] }> = { LOW: { label: 'Low', variant: 'success' }, MEDIUM: { label: 'Medium', variant: 'warning' }, HIGH: { label: 'High', variant: 'critical' } };
function localEstimate(o: OpportunitySummary) {
  return o.estimatedValue.trim() ? o.currencySymbol?.trim() ? `${o.currencySymbol.trim()} ${Number(o.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(o.estimatedValue, o.currencyCode) : 'Not provided';
}
function OpportunityEstimates({ opportunity: o }: { opportunity: OpportunitySummary }) {
  return <div className="space-y-0.5">
    <div><span className="block text-[10.5px] leading-tight text-muted-foreground">Client budget</span><strong className="text-[12.5px]">{localEstimate(o)}</strong></div>
    <div><span className="block text-[10.5px] leading-tight text-muted-foreground">Client budget (USD)</span><strong className="text-[12.5px]">{o.estimatedValueUsd?.trim() ? money(o.estimatedValueUsd, 'USD') : 'Not provided'}</strong></div>
  </div>;
}
// Decorative only: a vibrant, deterministic accent for the owner's initials avatar. Carries no data of its own.
const AVATAR_ACCENTS = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-700', 'bg-amber-600', 'bg-pink-600', 'bg-cyan-600'];
function avatarAccent(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}
function initials(name: string) {
  const [first, second] = name.trim().split(/\s+/);
  return (`${first?.[0] ?? ''}${second?.[0] ?? first?.[1] ?? ''}`).toUpperCase();
}
/** Label the owner explicitly and show their full name beside the decorative initials. */
function OwnerBadge({ opportunity: o }: { opportunity: OpportunitySummary }) {
  const ownerName = o.owner ? (o.owner.name || o.owner.email) : '';
  if (!ownerName) return <span>Owner: Unassigned</span>;
  return <span className="inline-flex min-w-0 items-center gap-1.5"><Avatar className="size-[22px] shrink-0" aria-hidden="true"><AvatarFallback className={cn('text-[10px] font-bold text-white', avatarAccent(ownerName))}>{initials(ownerName)}</AvatarFallback></Avatar><span className="min-w-0 break-words text-[11px]"><span className="font-medium">Owner:</span> {userLabel(o.owner)}</span></span>;
}
function StageProgress({ state, className }: { state: OpportunityState; className?: string }) {
  const step = progressStep(state);
  return <SegmentedProgress value={step} max={PROGRESS_STEPS.length} indicatorClassName={STAGE_TONE[state].fill} aria-label={`Stage ${step} of ${PROGRESS_STEPS.length}`} className={className} />;
}
function OpportunityBadges({ opportunity: o }: { opportunity: OpportunitySummary }) {
  return <span className="flex flex-wrap items-center gap-1">
    <Badge size="sm" variant={o.rfpType === 'QUESTIONNAIRE' ? 'violet' : o.rfpType === 'GENERIC' ? 'info' : 'muted'}>{o.rfpType === 'GENERIC' ? 'Generic RFP' : o.rfpType === 'QUESTIONNAIRE' ? 'Questionnaire' : 'RFP not selected'}</Badge>
    <Badge size="sm" variant={PRIORITY[o.priority]?.variant ?? 'outline'}>{PRIORITY[o.priority]?.label ?? o.priority}</Badge>
  </span>;
}
/** List view row: the same compact details and stage colours as the board card, laid out in columns. */
function OpportunityRow({ opportunity: o, highlight }: { opportunity: OpportunitySummary; highlight: boolean }) {
  return <TableRow className={cn('hover:bg-accent/50', highlight && 'opp-highlight')}>
    <TableCell className={cn('min-w-[200px] border-l-[3px]', STAGE_TONE[o.state].edge)}><Link className="break-words text-[13px] font-semibold text-primary hover:underline" to={`/opportunity/${o.id}/details`}>{o.title}</Link><div className="mt-0.5 flex flex-wrap items-center gap-1.5"><OpportunityNumber number={o.number} /><OpportunityBadges opportunity={o} /></div></TableCell>
    <TableCell className="text-[12.5px]">{o.clientName || <span className="text-muted-foreground">Client not provided</span>}</TableCell>
    <TableCell className="hidden lg:table-cell"><OwnerBadge opportunity={o} /></TableCell>
    <TableCell className="hidden whitespace-nowrap text-[12.5px] lg:table-cell">{o.submissionDeadline || <span className="text-muted-foreground">Not set</span>}</TableCell>
    <TableCell className="whitespace-nowrap text-right"><strong className="block text-[12.5px]">{localEstimate(o)}</strong><span className="block text-[11px] text-muted-foreground">{o.estimatedValueUsd?.trim() ? money(o.estimatedValueUsd, 'USD') : 'USD not provided'}</span></TableCell>
    <TableCell className="w-[140px]"><Status {...o} size="sm" /><StageProgress state={o.state} className="mt-1.5 max-w-[120px]" /></TableCell>
  </TableRow>;
}
function OpportunityCard({ opportunity: o, highlight }: { opportunity: OpportunitySummary; highlight: boolean }) {
  return <Card className={cn('min-w-0 overflow-hidden border-t-[3px] shadow-sm transition-shadow hover:shadow-md', STAGE_TONE[o.state].top, highlight && 'opp-highlight')}>
    <Link className="block px-2.5 pb-2 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" to={`/opportunity/${o.id}/details`} aria-label={`View ${o.title}`}>
      <div className="flex flex-wrap items-center justify-between gap-1.5"><OpportunityNumber number={o.number} /><OpportunityBadges opportunity={o} /></div>
      <h3 className="mt-1 break-words text-[13px] font-semibold leading-snug">{o.title}</h3><p className="text-[11.5px] text-muted-foreground">{o.clientName || 'Client not provided'}</p>
      <div className="mt-1.5"><OpportunityEstimates opportunity={o} /></div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t pt-1.5 text-[11px] text-muted-foreground">
        <span>Due {o.submissionDeadline || 'Not set'}</span>
        <OwnerBadge opportunity={o} />
      </div>
      <StageProgress state={o.state} className="mt-1.5" /><div className="mt-1.5"><Status {...o} size="sm" /></div><p className="mt-1.5 border-t pt-1.5 text-[11px] text-muted-foreground">Created by: {o.createdBy?.name || o.createdBy?.email || 'Not available'}</p>
    </Link>
  </Card>;
}
function OpportunityBoard({ opportunities, savedId }: { opportunities: OpportunitySummary[]; savedId: string | null }) {
  type Lane = { key: string; label: string; state: OpportunityState; order: number; items: OpportunitySummary[] };
  const lanes = new Map<string, Lane>();
  if (opportunities.some(o => o.stageId != null)) {
    for (const [order, stageId] of PIPELINE_STAGE_IDS.entries()) {
      const state = stageId === 1 ? 'SALES_REVIEW' : stageId === 2 || stageId === 4 ? 'GATE1_PENDING' : stageId === 3 || stageId === 6 || stageId === 10 ? 'IN_PROGRESS' : stageId === 8 || stageId === 9 ? 'GATE1_NO_GO' : 'GATE1_GO';
      lanes.set(`stage-${stageId}`, { key: `stage-${stageId}`, label: stageId === 7 ? OPPORTUNITY_OUTCOME_LABEL : STAGE_LABELS[stageId], state, order, items: [] });
    }
  } else {
    for (const state of ['SALES_REVIEW', 'GATE1_PENDING'] as const) lanes.set(state, { key: state, label: STATE_LABELS[state], state, order: STAGES.indexOf(state), items: [] });
  }
  for (const opportunity of opportunities) {
    const { stageId, state } = opportunity;
    const key = stageId == null ? state : `stage-${isOpportunityOutcome(stageId) ? 7 : stageId}`;
    if (!lanes.has(key)) lanes.set(key, { key, label: stageId == null ? STATE_LABELS[state] : STAGE_LABELS[stageId] ?? `Stage ${stageId}`, state, order: stageId ?? STAGES.indexOf(state), items: [] });
    lanes.get(key)!.items.push(opportunity);
  }
  return <div className="opp-board">{Array.from(lanes.values()).sort((a, b) => a.order - b.order).map(lane => <section key={lane.key} className={`opp-lane opp-state-${lane.state}`}>
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="opp-lane-dot" aria-hidden="true" /><span className="flex-1">{lane.label}</span><Badge variant="outline">{lane.items.length}</Badge></h3>
    {lane.items.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={savedId === o.id} />)}
    {!lane.items.length && <p className="opp-empty text-xs">No opportunities in this stage.</p>}
  </section>)}</div>;
}
export function PipelinePage({ queue = 'PIPELINE' }: { queue?: ListFilter['queue'] }) {
  const service = useOpportunityService(), access = useOpportunityAccess();
  const [search, setSearch] = useState(''), [view, setView] = useState<'board' | 'list'>('board'), [after, setAfter] = useState<string | null>(null);
  const query = useDebounce(search), [params] = useSearchParams();
  const allowed = access.view && (queue !== 'PIPELINE' || (access.pipeline ?? false)) && (queue !== 'MY_APPROVALS' || access.approvals) && (queue !== 'MY_WORK' || access.work);
  const visited = useRef<ListFilter['queue']>();
  useEffect(() => { if (allowed) visited.current = queue; }, [allowed, queue]);
  const load = useCallback((signal: AbortSignal) => service.list({ search: query, queue, after, first: 50 }, signal), [service, query, queue, after]);
  const resource = useResource(load, allowed);
  const title = queue === 'MY_APPROVALS' ? 'My approvals' : queue === 'MY_WORK' ? 'My Work' : 'Opportunity pipeline';
  useSetPageTitle(title);
  const list = resource.data?.nodes ?? [];
  if (!allowed || resource.error?.message.includes('You do not have permission to view this workflow.')) return <AccessUnavailable page={title} changed={visited.current === queue} destination={
    queue !== 'PIPELINE' && access.pipeline ? { path: '/opportunity', label: 'Go to Pipeline' } :
    queue !== 'MY_WORK' && access.work ? { path: '/opportunity/work', label: 'Go to My Work' } :
    queue !== 'MY_APPROVALS' && access.approvals ? { path: '/opportunity/approvals', label: 'Go to My approvals' } : undefined
  } />;
  return <div className="opp-page">
    <div className="opp-heading"><div><p className="opp-eyebrow">{queue === 'MY_APPROVALS' ? 'OPPORTUNITY REVIEWS' : 'OPPORTUNITY MANAGEMENT'}</p><h2>{title}</h2><p className="text-sm text-muted-foreground">{queue === 'MY_APPROVALS' ? 'Track opportunities across all stages. Open Overview to take the action available to your role.' : queue === 'MY_WORK' ? 'Your preparation, response and review tasks, in one place.' : 'Track every opportunity through approvals, estimation, proposal, negotiation and outcome.'}</p></div>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new"><Plus className="size-4" />Add Opportunity</Link></Button>}</div>
    {resource.loading ? <Loading label="Loading permitted opportunities…" /> : resource.error ? <Notice error={resource.error} retry={resource.reload} title="Pipeline unavailable" /> : resource.data && <>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">{[
        { title: 'All opportunities', value: resource.data.totalCount, hint: 'Permitted opportunities', icon: Briefcase, tone: 'border-t-primary', iconTone: 'text-primary', wash: 'to-primary/5' },
        { title: 'Pending approval', value: list.filter(o => o.stageId == null ? o.state === 'SALES_REVIEW' : o.stageId === 1 && o.subStageId === 1 || o.stageId === 2 && o.subStageId === 4 || o.stageId === 4 && o.subStageId === 8).length, hint: 'Awaiting a reviewer decision', icon: Clock, tone: 'border-t-progress-3', iconTone: 'text-progress-3', wash: 'to-progress-3/5' },
        { title: 'Won opportunities', value: list.filter(o => o.stageId === 7 && o.subStageId === 13).length, hint: 'Closed — Won', icon: CheckCircle2, tone: 'border-t-progress-5', iconTone: 'text-progress-5', wash: 'to-progress-5/5' },
      ].map(stat => <Card key={stat.title} className={cn('min-w-0 border-t-[3px] bg-gradient-to-br from-card from-50% shadow-sm', stat.tone, stat.wash)}><section className="px-3 py-2.5"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{stat.title}<stat.icon className={cn('size-4 shrink-0', stat.iconTone)} /></div><strong className="my-0.5 block break-words text-xl font-semibold">{stat.value}</strong><p className="text-xs text-muted-foreground">{stat.hint}</p></section></Card>)}</div>
    </>}
    <div className="my-3 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search opportunities" placeholder="Search opportunity, client or reference…" value={search} onChange={e => { setSearch(e.target.value); setAfter(null); }} /></div><div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Pipeline view">{(['board', 'list'] as const).map(v => <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'board' ? 'Board' : 'List'}</Button>)}</div></div>
    {resource.data && !resource.loading && !resource.error && (list.length === 0 ? <section className="opp-empty"><Briefcase className="mx-auto mb-4 size-8 text-primary" /><h3 className="text-xl font-semibold">{query ? 'No matching opportunities' : 'Your pipeline starts here'}</h3><p className="my-3 text-sm text-muted-foreground">{query ? 'Try a different search.' : 'No opportunities were returned for your permitted scope.'}</p>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new">Add Opportunity</Link></Button>}</section> : view === 'board' ? <TooltipProvider delayDuration={150}><OpportunityBoard opportunities={list} savedId={params.get('saved')} /></TooltipProvider> : <div className="space-y-3">{/* Stacked list remains usable on mobile without page overflow. */}<TooltipProvider delayDuration={150}><div className="hidden overflow-hidden rounded-xl border bg-card md:block"><Table><TableHeader className="bg-muted/50"><TableRow className="hover:bg-transparent"><TableHead className="h-9 text-[11px] uppercase tracking-wide">Opportunity</TableHead><TableHead className="h-9 text-[11px] uppercase tracking-wide">Client</TableHead><TableHead className="hidden h-9 text-[11px] uppercase tracking-wide lg:table-cell">Owner</TableHead><TableHead className="hidden h-9 text-[11px] uppercase tracking-wide lg:table-cell">Due</TableHead><TableHead className="h-9 text-right text-[11px] uppercase tracking-wide">Value · USD</TableHead><TableHead className="h-9 text-[11px] uppercase tracking-wide">Stage</TableHead></TableRow></TableHeader><TableBody>{list.map(o => <OpportunityRow key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}</TableBody></Table></div><div className="grid gap-2 md:hidden">{list.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}</div></TooltipProvider></div>)}
    {resource.data?.hasNextPage && <Button variant="outline" className="mt-5" onClick={() => setAfter(resource.data?.endCursor ?? null)}>Next page</Button>}
    {after && <Button variant="ghost" className="ml-3 mt-5" onClick={() => setAfter(null)}>First page</Button>}
  </div>;
}
