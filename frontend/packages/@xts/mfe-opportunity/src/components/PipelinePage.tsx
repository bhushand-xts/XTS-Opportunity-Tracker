import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Clock, Plus, Search, CheckCircle2 } from 'lucide-react';
import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useSetPageTitle } from '@xts/design-system';
import type { ListFilter, OpportunitySummary, OpportunityState } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource, useDebounce } from '../hooks/useResource';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { Loading, Notice, Status } from './ui';
import { money, STATE_LABELS, userLabel } from '../lib/workflow';
import { AccessUnavailable } from './AccessUnavailable';
import { STAGE_NAMES } from '../lib/opportunityStages';

const STAGES: OpportunityState[] = ['PREPARATION_PENDING', 'IN_PROGRESS', 'SALES_REVIEW', 'GATE1_PENDING', 'GATE1_GO', 'SALES_REJECTED', 'GATE1_NO_GO'];
function OpportunityEstimates({ opportunity: o }: { opportunity: OpportunitySummary }) {
  return <div className="space-y-1">
    <div><span className="block text-xs text-muted-foreground">Estimated value</span><strong>{o.estimatedValue.trim() ? o.currencySymbol?.trim() ? `${o.currencySymbol.trim()} ${Number(o.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(o.estimatedValue, o.currencyCode) : 'Not provided'}</strong></div>
    <div><span className="block text-xs text-muted-foreground">Estimated value (USD)</span><strong>{o.estimatedValueUsd?.trim() ? money(o.estimatedValueUsd, 'USD') : 'Not provided'}</strong></div>
  </div>;
}
function OpportunityCard({ opportunity: o, highlight }: { opportunity: OpportunitySummary; highlight: boolean }) {
  return <article className={`opp-pipeline-card ${highlight ? 'opp-highlight' : ''}`}>
    <Link className="opp-card-main" to={`/opportunity/${o.id}/details`} aria-label={`View ${o.title}`}>
      <div className="flex flex-wrap justify-between gap-2"><span className="text-xs text-muted-foreground">{o.number}</span><Badge variant="outline">{o.priority}</Badge></div>
      <h3 className="opp-card-title break-words font-semibold">{o.title}</h3><p className="text-xs text-muted-foreground">{o.clientName || 'Client not provided'}</p>
      {o.stageId != null && <div className="mt-2"><Status state={o.state} opportunity={o} /></div>}
      <div className="opp-card-value flex flex-wrap items-start justify-between gap-2"><OpportunityEstimates opportunity={o} /><Badge variant="secondary">{o.rfpType === 'GENERIC' ? 'Generic RFP' : o.rfpType === 'QUESTIONNAIRE' ? 'Questionnaire' : 'RFP not selected'}</Badge></div>
      <div className="opp-card-meta flex flex-wrap justify-between gap-2 border-t text-xs text-muted-foreground"><span>Due {o.submissionDeadline || 'Not set'}</span><span>{userLabel(o.owner)}</span></div>
    </Link>
  </article>;
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
  const actualStages = list.some(o => o.stageId != null);
  const lanes = actualStages
    ? [...new Set([1, 2, ...list.map(o => o.stageId).filter((id): id is number => id != null)])].sort((a, b) => a - b).map(id => ({ key: String(id), label: STAGE_NAMES[id] ?? `Stage ${id}`, items: list.filter(o => o.stageId === id) }))
    : STAGES.filter(stage => list.some(o => o.state === stage) || ['SALES_REVIEW', 'GATE1_PENDING'].includes(stage)).map(stage => ({ key: stage, label: STATE_LABELS[stage], items: list.filter(o => o.state === stage) }));
  const totalLabel = money(list.reduce((sum, o) => sum + Number(o.estimatedValueUsd || 0), 0).toFixed(2), 'USD');
  if (!allowed || resource.error?.message.includes('You do not have permission to view this workflow.')) return <AccessUnavailable page={title} changed={visited.current === queue} destination={
    queue !== 'PIPELINE' && access.pipeline ? { path: '/opportunity', label: 'Go to Pipeline' } :
    queue !== 'MY_WORK' && access.work ? { path: '/opportunity/work', label: 'Go to My Work' } :
    queue !== 'MY_APPROVALS' && access.approvals ? { path: '/opportunity/approvals', label: 'Go to My approvals' } : undefined
  } />;
  return <div className="opp-page">
    <div className="opp-heading"><div><p className="opp-eyebrow">{queue === 'MY_APPROVALS' ? 'REVIEW & GATE 1' : 'OPPORTUNITY MANAGEMENT'}</p><h2>{title}</h2><p className="text-sm text-muted-foreground">{queue === 'MY_APPROVALS' ? 'Open Overview to approve opportunities automatically assigned to you.' : queue === 'MY_WORK' ? 'Your preparation, response and review tasks, in one place.' : 'A clear view of every opportunity, from first contact to Gate 1.'}</p></div>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new"><Plus className="size-4" />Add Opportunity</Link></Button>}</div>
    {resource.loading ? <Loading label="Loading permitted opportunities…" /> : resource.error ? <Notice error={resource.error} retry={resource.reload} title="Pipeline unavailable" /> : resource.data && <>
      <div className="opp-stats">{[
        { title: 'All opportunities', value: resource.data.totalCount, hint: 'Permitted opportunities', icon: Briefcase },
        { title: 'Pipeline value', value: totalLabel, hint: 'Total estimated value (USD)', icon: Briefcase },
        { title: 'Pending approval', value: list.filter(o => o.state === 'SALES_REVIEW').length, hint: 'Awaiting Sales Head approval', icon: Clock },
        { title: 'Gate 1 approved', value: list.filter(o => o.state === 'GATE1_GO').length, hint: 'Approved opportunities retained', icon: CheckCircle2 },
      ].map(stat => <section key={stat.title} className="opp-stat"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{stat.title}<stat.icon className="size-4" /></div><strong>{stat.value}</strong><p className="text-xs text-muted-foreground">{stat.hint}</p></section>)}</div>
    </>}
    <div className="my-3 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search opportunities" placeholder="Search opportunity, client or reference…" value={search} onChange={e => { setSearch(e.target.value); setAfter(null); }} /></div><div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Pipeline view">{(['board', 'list'] as const).map(v => <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'board' ? 'Board' : 'List'}</Button>)}</div></div>
    {resource.data && !resource.loading && !resource.error && (list.length === 0 ? <section className="opp-empty"><Briefcase className="mx-auto mb-4 size-8 text-primary" /><h3 className="text-xl font-semibold">{query ? 'No matching opportunities' : 'Your pipeline starts here'}</h3><p className="my-3 text-sm text-muted-foreground">{query ? 'Try a different search.' : 'No opportunities were returned for your permitted scope.'}</p>{access.add && queue === 'PIPELINE' && <Button asChild><Link to="/opportunity/new">Add Opportunity</Link></Button>}</section> : view === 'board' ? <div className="opp-board">{lanes.map(lane => <section key={lane.key} className="opp-lane"><h3 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">{lane.label}<Badge variant="outline">{lane.items.length}</Badge></h3>{lane.items.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}{!lane.items.length && <p className="opp-empty text-xs">No opportunities in this stage.</p>}</section>)}</div> : <div className="space-y-3">{/* Stacked list remains usable on mobile without page overflow. */}<Table className="hidden md:table"><TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Client</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{list.map(o => <TableRow key={o.id}><TableCell><Link className="font-semibold text-primary" to={`/opportunity/${o.id}/details`}>{o.title}</Link><p className="text-xs text-muted-foreground">{o.number}</p></TableCell><TableCell>{o.clientName}</TableCell><TableCell><OpportunityEstimates opportunity={o} /></TableCell><TableCell><Status state={o.state} opportunity={o} /></TableCell></TableRow>)}</TableBody></Table><div className="space-y-3 md:hidden">{list.map(o => <OpportunityCard key={o.id} opportunity={o} highlight={params.get('saved') === o.id} />)}</div></div>)}
    {resource.data?.hasNextPage && <Button variant="outline" className="mt-5" onClick={() => setAfter(resource.data?.endCursor ?? null)}>Next page</Button>}
    {after && <Button variant="ghost" className="ml-3 mt-5" onClick={() => setAfter(null)}>First page</Button>}
  </div>;
}
