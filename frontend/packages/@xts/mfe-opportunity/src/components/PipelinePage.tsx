import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, Ban, Briefcase, ChevronLeft, ChevronRight, Clock, Plus, Search, CheckCircle2, CircleX, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Button, Card, cn, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useSetPageTitle } from '@xts/design-system';
import type { ListFilter, OpportunitySummary, OpportunityState } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource, useDebounce } from '../hooks/useResource';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { avatarAccent, initials, Loading, Notice, OpportunityNumber, PRIORITY_BADGE, Status } from './ui';
import { money, STATE_LABELS, userLabel } from '../lib/workflow';
import { AccessUnavailable } from './AccessUnavailable';
import { isOpportunityOutcome, OPPORTUNITY_OUTCOME_LABEL, opportunityStatus, PIPELINE_STAGE_IDS, STAGE_LABELS } from '../lib/opportunityStatus';

const STAGES: OpportunityState[] = ['PREPARATION_PENDING', 'IN_PROGRESS', 'SALES_REVIEW', 'GATE1_PENDING', 'GATE1_GO', 'SALES_REJECTED', 'GATE1_NO_GO'];
// Seven persisted workflow positions; holds remain at the stage they paused in.
const PROGRESS_STAGE_LABELS = ['Identified', 'Qualification', 'Engineering', 'Estimate review', 'Proposal', 'Negotiation', 'Outcome'];
function progressPosition(o: OpportunitySummary): number {
  if (o.stageId === 1) return 1;
  if (o.stageId === 2) return 2;
  if (o.stageId === 3) return 3;
  if (o.stageId === 4) return 4;
  if (o.stageId === 5) return 5;
  if (o.stageId === 6) return 6;
  if (o.stageId === 7 || o.stageId === 8) return 7;
  if (o.stageId === 9) return ({ 15: 1, 16: 2, 17: 4, 18: 7 } as Record<number, number>)[o.subStageId ?? 0] ?? 7;
  if (o.stageId === 10) return o.subStageId === 19 ? 6 : 5;
  return ({ PREPARATION_PENDING: 1, SALES_REVIEW: 1, GATE1_PENDING: 2, IN_PROGRESS: 3, GATE1_GO: 3, SALES_REJECTED: 1, GATE1_NO_GO: 2 } as Record<OpportunityState, number>)[o.state];
}
// Full class names (not built from strings) so Tailwind can see them.
const STAGE_TONE: Record<OpportunityState, { top: string; edge: string }> = {
  PREPARATION_PENDING: { top: 'border-t-progress-1', edge: 'border-l-progress-1' },
  IN_PROGRESS: { top: 'border-t-progress-2', edge: 'border-l-progress-2' },
  SALES_REVIEW: { top: 'border-t-progress-3', edge: 'border-l-progress-3' },
  GATE1_PENDING: { top: 'border-t-progress-4', edge: 'border-l-progress-4' },
  GATE1_GO: { top: 'border-t-progress-5', edge: 'border-l-progress-5' },
  SALES_REJECTED: { top: 'border-t-destructive', edge: 'border-l-destructive' },
  GATE1_NO_GO: { top: 'border-t-destructive', edge: 'border-l-destructive' },
};
function localEstimate(o: OpportunitySummary) {
  return o.estimatedValue.trim() ? o.currencySymbol?.trim() ? `${o.currencySymbol.trim()} ${Number(o.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(o.estimatedValue, o.currencyCode) : 'Not provided';
}
function OpportunityEstimates({ opportunity: o }: { opportunity: OpportunitySummary }) {
  const estimate = localEstimate(o);
  const usd = o.estimatedValueUsd?.trim() ? money(o.estimatedValueUsd, 'USD') : 'USD not provided';
  return <div className="min-w-0 flex-1"><span className="block text-[10.5px] leading-tight text-muted-foreground">Client budget</span><div className="flex min-w-0 items-baseline gap-1.5"><strong className="min-w-0 truncate text-[12.5px]" title={estimate}>{estimate}</strong><span className="min-w-0 truncate text-[11px] text-muted-foreground" title={usd}>({usd})</span></div></div>;
}
/** Compact attribution avatar; full identity stays available on hover and to assistive technology. */
function PersonBadge({ person, label }: { person: OpportunitySummary['owner'] | undefined; label: 'Assigned' | 'Created by' }) {
  const name = person ? person.name || person.email : '';
  if (!person || !name) return null;
  const accessibleName = `${label} ${userLabel(person)}`;
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex min-w-0 items-center"><Avatar className="size-[22px] shrink-0"><AvatarFallback className={cn('text-[10px] font-bold text-white', avatarAccent(name))}>{initials(name)}</AvatarFallback></Avatar><span className="sr-only">{accessibleName}</span></span></TooltipTrigger><TooltipContent>{accessibleName}</TooltipContent></Tooltip>;
}
function OpportunityCardStatus({ opportunity: o }: { opportunity: OpportunitySummary }) {
  const status = opportunityStatus(o);
  const label = status.substage ?? status.stage;
  const won = o.stageId === 7 && o.subStageId === 13;
  const lost = o.stageId === 8 && o.subStageId === 14;
  const rejected = o.stageId === 9 || o.state === 'SALES_REJECTED' || o.state === 'GATE1_NO_GO';
  const held = o.stageId === 10;
  const tone = won ? 'text-emerald-700 dark:text-emerald-400' : lost || rejected ? 'text-red-700 dark:text-red-400' : held ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400';
  const dot = won ? 'bg-emerald-600' : lost || rejected ? 'bg-red-600' : held ? 'bg-amber-600' : 'bg-blue-600';
  const content = <span role="status" aria-label={label} className={cn('inline-flex min-w-0 max-w-full items-start gap-1.5 text-[11px] font-semibold', tone)}>
    <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
    <span className="min-w-0 whitespace-normal break-words text-right">{rejected ? 'Rejected' : label}</span>
  </span>;
  return rejected ? <Tooltip><TooltipTrigger asChild>{content}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip> : content;
}
function StageProgress({ opportunity, className }: { opportunity: OpportunitySummary; className?: string }) {
  const step = progressPosition(opportunity);
  const rejected = opportunity.stageId === 9 || opportunity.state === 'SALES_REJECTED' || opportunity.state === 'GATE1_NO_GO';
  const won = opportunity.stageId === 7 && opportunity.subStageId === 13;
  const lost = opportunity.stageId === 8 && opportunity.subStageId === 14;
  const held = opportunity.stageId === 10;
  const activeColor = rejected || lost ? 'bg-destructive' : won ? 'bg-progress-5' : held ? 'bg-amber-500' : 'bg-progress-3';
  const status = opportunityStatus(opportunity);
  const currentLabel = status.substage ?? status.stage;
  return <div role="progressbar" aria-valuemin={0} aria-valuemax={PROGRESS_STAGE_LABELS.length} aria-valuenow={step} aria-valuetext={`${currentLabel}; ${PROGRESS_STAGE_LABELS[step - 1]} step ${step} of ${PROGRESS_STAGE_LABELS.length}`} className={cn('grid gap-0.5', className)} style={{ gridTemplateColumns: `repeat(${PROGRESS_STAGE_LABELS.length}, minmax(0, 1fr))` }}>
    {PROGRESS_STAGE_LABELS.map((label, index) => <span key={label} title={`${label}${index + 1 === step ? ' (current)' : ''}`} className={cn('h-[3px] rounded-full', index < step - 1 ? 'bg-progress-5' : index === step - 1 ? activeColor : 'bg-muted')} />)}
  </div>;
}
function OpportunityBadges({ opportunity: o }: { opportunity: OpportunitySummary }) {
  return <span className="flex flex-wrap items-center gap-1">
    <Badge size="sm" variant={o.rfpType === 'QUESTIONNAIRE' ? 'violet' : o.rfpType === 'GENERIC' ? 'info' : 'muted'}>{o.rfpType === 'GENERIC' ? 'Generic RFP' : o.rfpType === 'QUESTIONNAIRE' ? 'Questionnaire' : 'RFP not selected'}</Badge>
    <Badge size="sm" variant={PRIORITY_BADGE[o.priority]?.variant ?? 'outline'}>{PRIORITY_BADGE[o.priority]?.label ?? o.priority}</Badge>
  </span>;
}
/** List view row: the same compact details and stage colours as the board card, laid out in columns. */
function OpportunityRow({ opportunity: o, highlight }: { opportunity: OpportunitySummary; highlight: boolean }) {
  return <TableRow className={cn('hover:bg-accent/50', highlight && 'opp-highlight')}>
    <TableCell className={cn('min-w-[200px] border-l-[3px]', STAGE_TONE[o.state].edge)}><Link className="break-words text-[13px] font-semibold text-primary hover:underline" to={`/opportunity/${o.id}/details`}>{o.title}</Link><div className="mt-0.5 flex flex-wrap items-center gap-1.5"><OpportunityNumber number={o.number} /><OpportunityBadges opportunity={o} /></div></TableCell>
    <TableCell className="text-[12.5px]">{o.clientName || <span className="text-muted-foreground">Client not provided</span>}</TableCell>
    <TableCell className="hidden lg:table-cell"><PersonBadge person={o.owner} label="Assigned" /></TableCell>
    <TableCell className="hidden whitespace-nowrap text-[12.5px] lg:table-cell">{o.submissionDeadline || <span className="text-muted-foreground">Not set</span>}</TableCell>
    <TableCell className="whitespace-nowrap text-right"><strong className="block text-[12.5px]">{localEstimate(o)}</strong><span className="block text-[11px] text-muted-foreground">{o.estimatedValueUsd?.trim() ? money(o.estimatedValueUsd, 'USD') : 'USD not provided'}</span></TableCell>
    <TableCell className="w-[140px]"><Status {...o} size="sm" /><StageProgress opportunity={o} className="mt-1.5 max-w-[120px]" /></TableCell>
  </TableRow>;
}
function OpportunityCard({ opportunity: o, highlight }: { opportunity: OpportunitySummary; highlight: boolean }) {
  return <Card className={cn('mb-2.5 w-full max-w-full min-w-0 overflow-hidden border-t-[3px] shadow-sm transition-shadow hover:shadow-md last:mb-0', STAGE_TONE[o.state].top, highlight && 'opp-highlight')}>
    <Link className="block px-2.5 pb-2 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" to={`/opportunity/${o.id}/details`} aria-label={`View ${o.title}`}>
      <div className="opp-card-number flex flex-wrap items-start gap-1.5"><OpportunityNumber number={o.number} /></div>
      <div className="mt-1 flex flex-wrap items-center gap-1"><OpportunityBadges opportunity={o} /></div>
      <h3 title={o.title} className="opp-card-title mt-1 text-[13px] font-semibold leading-snug">{o.title}</h3><p title={o.clientName || 'Client not provided'} className="opp-card-client text-[11.5px] text-muted-foreground">{o.clientName || 'Client not provided'}</p>
      <div className="mt-1 flex min-w-0 items-end justify-between gap-2"><OpportunityEstimates opportunity={o} /><PersonBadge person={o.createdBy} label="Created by" /></div>
      <StageProgress opportunity={o} className="mt-1" />
      <div className="mt-1.5 grid min-w-0 gap-1 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate" title={`Due ${o.submissionDeadline || 'Not set'}`}>Due {o.submissionDeadline || 'Not set'}</span>
        <span className="flex min-w-0 justify-end"><OpportunityCardStatus opportunity={o} /></span>
      </div>
    </Link>
  </Card>;
}
function OpportunityBoard({ opportunities, savedId, showAllStages, stageIds }: { opportunities: OpportunitySummary[]; savedId: string | null; showAllStages: boolean; stageIds?: number[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardId = useId(), helpId = useId();
  const scrollStages = (direction: number) => {
    const board = boardRef.current;
    if (board) board.scrollBy({ left: direction * board.clientWidth * 0.8, behavior: 'auto' });
  };
  // Fit the board below the current header and filters. Cards scroll inside
  // each lane, keeping the board's native horizontal scrollbar in view.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const container = board.parentElement!, page = container.parentElement!;
    const measure = () => {
      let footerHeight = 0;
      for (let sibling = container.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        const style = window.getComputedStyle(sibling);
        footerHeight = Math.max(footerHeight, sibling.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0));
      }
      const top = board.getBoundingClientRect().top + window.scrollY;
      const bottom = (parseFloat(window.getComputedStyle(page).paddingBottom) || 0) + footerHeight + 8;
      board.style.setProperty('--opp-board-height', `${Math.max(120, window.innerHeight - top - bottom)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); };
  }, [opportunities.length, showAllStages, stageIds?.join(',')]);
  type Lane = { key: string; label: string; state: OpportunityState; order: number; items: OpportunitySummary[] };
  const lanes = new Map<string, Lane>();
  const initialStages = stageIds ?? (showAllStages && opportunities.some(o => o.stageId != null) ? PIPELINE_STAGE_IDS : []);
  if (initialStages.length) {
    for (const [order, stageId] of initialStages.entries()) {
      const state = stageId === 1 ? 'SALES_REVIEW' : stageId === 2 || stageId === 4 ? 'GATE1_PENDING' : stageId === 3 || stageId === 6 || stageId === 10 ? 'IN_PROGRESS' : stageId === 8 || stageId === 9 ? 'GATE1_NO_GO' : 'GATE1_GO';
      lanes.set(`stage-${stageId}`, { key: `stage-${stageId}`, label: stageId === 7 ? OPPORTUNITY_OUTCOME_LABEL : STAGE_LABELS[stageId], state, order, items: [] });
    }
  } else if (showAllStages) {
    for (const state of ['SALES_REVIEW', 'GATE1_PENDING'] as const) lanes.set(state, { key: state, label: STATE_LABELS[state], state, order: STAGES.indexOf(state), items: [] });
  }
  for (const opportunity of opportunities) {
    const { stageId, state } = opportunity;
    const key = stageId == null ? state : `stage-${isOpportunityOutcome(stageId) ? 7 : stageId}`;
    if (!lanes.has(key)) lanes.set(key, { key, label: stageId == null ? STATE_LABELS[state] : STAGE_LABELS[stageId] ?? `Stage ${stageId}`, state, order: stageId ?? STAGES.indexOf(state), items: [] });
    lanes.get(key)!.items.push(opportunity);
  }
  return <div className="opp-board-container">
    <div className="mb-2 flex items-center justify-between gap-3">
      <p id={helpId} className="text-xs text-muted-foreground">{lanes.size} stages · Scroll sideways to view all stages</p>
      <div className="flex shrink-0 gap-1" role="group" aria-label="Board navigation">
        <Button size="icon" variant="outline" className="size-8" aria-label="Previous stages" aria-controls={boardId} onClick={() => scrollStages(-1)}><ChevronLeft className="size-4" /></Button>
        <Button size="icon" variant="outline" className="size-8" aria-label="Next stages" aria-controls={boardId} onClick={() => scrollStages(1)}><ChevronRight className="size-4" /></Button>
      </div>
    </div>
    <div id={boardId} ref={boardRef} className="opp-board" role="region" aria-label="Pipeline stages" aria-describedby={helpId} tabIndex={0}>{Array.from(lanes.values()).sort((a, b) => a.order - b.order).map(lane => {
      const outcomeGroups = lane.key === 'stage-7' ? [
        { key: 'won', label: 'Won', tone: 'opp-outcome-won', items: lane.items.filter(item => item.stageId === 7) },
        { key: 'lost', label: 'Lost', tone: 'opp-outcome-lost', items: lane.items.filter(item => item.stageId === 8) },
        { key: 'hold', label: 'On Hold', tone: 'opp-outcome-hold', items: lane.items.filter(item => item.stageId === 10) },
      ].filter(group => group.items.length > 0) : null;
      return <section key={lane.key} className={`opp-lane opp-state-${lane.state}${lane.key === 'stage-7' ? ' opp-outcome-lane' : ''}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="opp-lane-dot" aria-hidden="true" /><span className="flex-1">{lane.label}</span><Badge variant="outline">{lane.items.length}</Badge></h3>
      <div className="opp-lane-cards" role="region" aria-label={`${lane.label} opportunities`} tabIndex={0}>
        {outcomeGroups ? outcomeGroups.map(group => <section key={group.key} className={`opp-outcome-group ${group.tone}`} aria-label={`${group.label} opportunities`}>
          <h4 className="opp-outcome-group-title"><span>{group.label}</span><span className="opp-outcome-group-count">{group.items.length}</span></h4>
          {group.items.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={savedId === o.id} />)}
        </section>) : lane.items.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={savedId === o.id} />)}
        {!lane.items.length && <p className="opp-empty text-xs">No opportunities in this stage.</p>}
      </div>
    </section>})}</div>
  </div>;
}
export function PipelinePage({ queue = 'PIPELINE' }: { queue?: ListFilter['queue'] }) {
  const service = useOpportunityService(), access = useOpportunityAccess();
  const [search, setSearch] = useState(''), [view, setView] = useState<'board' | 'list'>('board'), [after, setAfter] = useState<string | null>(null);
  const query = useDebounce(search), [params] = useSearchParams();
  const allowedPersonalQueues = access.personalQueues ?? (access.work || access.approvals);
  const allowed = access.view && (queue !== 'PIPELINE' || (access.pipeline ?? false)) && (queue === 'PIPELINE' || allowedPersonalQueues);
  const visited = useRef<ListFilter['queue']>();
  useEffect(() => { if (allowed) visited.current = queue; }, [allowed, queue]);
  const load = useCallback((signal: AbortSignal) => service.list({ search: query, queue, after, first: 50 }, signal), [service, query, queue, after]);
  const resultScope = JSON.stringify([access.userId, queue, access.approvalStageIds, access.workStageIds]);
  const resource = useResource(load, allowed, 0, resultScope);
  const title = queue === 'MY_APPROVALS' ? 'My Pending Work' : queue === 'MY_WORK' ? 'My Opportunities' : 'All Opportunities';
  useSetPageTitle(title);
  const list = resource.data?.nodes ?? [];
  const boardStageIds = queue === 'MY_APPROVALS' ? access.approvalStageIds?.filter(stageId => stageId !== 10) : undefined;
  const showEmptyBoard = view === 'board' && Boolean(boardStageIds?.length);
  const emptyTitle = query ? 'No matching opportunities' : queue === 'MY_APPROVALS' ? 'No pending work' : queue === 'MY_WORK' ? 'No opportunities created yet' : 'Your pipeline starts here';
  const emptyDescription = query ? 'Try a different search.' : queue === 'MY_APPROVALS' ? 'There are no opportunities waiting for action from you or your role.' : queue === 'MY_WORK' ? 'Opportunities you create will appear here.' : 'No opportunities were returned for your permitted scope.';
  if (!allowed || resource.error?.message.includes('You do not have permission to view this workflow.')) return <AccessUnavailable page={title} changed={visited.current === queue} destination={
    queue !== 'PIPELINE' && access.pipeline ? { path: '/opportunity', label: 'Go to Pipeline' } :
    queue !== 'MY_WORK' && allowedPersonalQueues ? { path: '/opportunity/work', label: 'Go to My Opportunities' } :
    queue !== 'MY_APPROVALS' && allowedPersonalQueues ? { path: '/opportunity/approvals', label: 'Go to My Pending Work' } : undefined
  } />;
  return <div className="opp-page opp-pipeline-page" aria-busy={resource.refreshing}>
    <div className="opp-heading"><div><h2>{title}</h2><p className="text-sm text-muted-foreground">{queue === 'MY_APPROVALS' ? 'Opportunities waiting for action from you or your role.' : queue === 'MY_WORK' ? 'Opportunities you created, across their current stages.' : 'Track every opportunity through approvals, estimation, proposal, negotiation and outcome.'}</p></div>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new"><Plus className="size-4" />Add Opportunity</Link></Button>}</div>
    {resource.loading ? <Loading label="Loading permitted opportunities…" /> : resource.error ? <Notice error={resource.error} retry={resource.reload} title="Pipeline unavailable" /> : resource.data && <>
      {queue !== 'MY_APPROVALS' && <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{[
        { title: 'Total opportunities', value: resource.data.totalCount, icon: Briefcase, tone: 'border-t-primary', iconTone: 'text-primary', wash: 'to-primary/5' },
        { title: 'Won opportunities', value: list.filter(o => o.stageId === 7 && o.subStageId === 13).length, icon: Trophy, tone: 'border-t-emerald-600', iconTone: 'text-emerald-700', wash: 'to-emerald-500/5' },
        { title: 'Lost opportunities', value: list.filter(o => o.stageId === 8 && o.subStageId === 14).length, icon: CircleX, tone: 'border-t-rose-600', iconTone: 'text-rose-700', wash: 'to-rose-500/5' },
        { title: 'In progress', value: list.filter(o => o.stageId !== 7 && o.stageId !== 8 && o.stageId !== 9).length, icon: Activity, tone: 'border-t-sky-600', iconTone: 'text-sky-700', wash: 'to-sky-500/5' },
        { title: 'No-Bid / Declined', value: list.filter(o => o.stageId === 9).length, icon: Ban, tone: 'border-t-slate-500', iconTone: 'text-slate-600', wash: 'to-slate-500/5' },
      ].map(stat => <Card key={stat.title} className={cn('min-w-0 border-t-[3px] bg-gradient-to-br from-card from-50% shadow-sm', stat.tone, stat.wash)}><section className="px-3 py-2.5"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{stat.title}<stat.icon className={cn('size-4 shrink-0', stat.iconTone)} /></div><strong className="my-0.5 block break-words text-xl font-semibold">{stat.value}</strong></section></Card>)}</div>}
    </>}
    <div className="my-3 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="border-slate-200 bg-white pl-9 shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/30" aria-label="Search opportunities" placeholder="Search opportunity, client or reference…" value={search} onChange={e => { setSearch(e.target.value); setAfter(null); }} /></div><div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Pipeline view">{(['board', 'list'] as const).map(v => <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'board' ? 'Board' : 'List'}</Button>)}</div></div>
    {resource.data && !resource.loading && !resource.error && (list.length === 0 && !showEmptyBoard ? <section className="opp-empty"><Briefcase className="mx-auto mb-4 size-8 text-primary" /><h3 className="text-xl font-semibold">{emptyTitle}</h3><p className="my-3 text-sm text-muted-foreground">{emptyDescription}</p>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new">Add Opportunity</Link></Button>}</section> : view === 'board' ? <TooltipProvider delayDuration={150}><OpportunityBoard opportunities={list} savedId={params.get('saved')} showAllStages={queue !== 'MY_APPROVALS' || !boardStageIds?.length} stageIds={boardStageIds} /></TooltipProvider> : <div className="space-y-3">{/* Stacked list remains usable on mobile without page overflow. */}<TooltipProvider delayDuration={150}><div className="hidden overflow-hidden rounded-xl border bg-card md:block"><Table><TableHeader className="bg-muted/50"><TableRow className="hover:bg-transparent"><TableHead className="h-9 text-[11px] uppercase tracking-wide">Opportunity</TableHead><TableHead className="h-9 text-[11px] uppercase tracking-wide">Client</TableHead><TableHead className="hidden h-9 text-[11px] uppercase tracking-wide lg:table-cell">Owner</TableHead><TableHead className="hidden h-9 text-[11px] uppercase tracking-wide lg:table-cell">Due</TableHead><TableHead className="h-9 text-right text-[11px] uppercase tracking-wide">Value · USD</TableHead><TableHead className="h-9 text-[11px] uppercase tracking-wide">Stage</TableHead></TableRow></TableHeader><TableBody>{list.map(o => <OpportunityRow key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}</TableBody></Table></div><div className="grid gap-2 md:hidden">{list.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}</div></TooltipProvider></div>)}
    {resource.data?.hasNextPage && <Button variant="outline" className="mt-5" onClick={() => setAfter(resource.data?.endCursor ?? null)}>Next page</Button>}
    {after && <Button variant="ghost" className="ml-3 mt-5" onClick={() => setAfter(null)}>First page</Button>}
  </div>;
}
