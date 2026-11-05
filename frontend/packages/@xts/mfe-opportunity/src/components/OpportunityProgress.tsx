import { useState } from 'react';
import { Check, ChevronDown, Undo2 } from 'lucide-react';
import type { DirectoryUser, OpportunityDetail, OpportunityStageHistory } from '@xts/api-contracts';
import { isOpportunityOutcome, OPPORTUNITY_OUTCOME_LABEL, opportunityStatus, STAGE_LABELS } from '../lib/opportunityStatus';
import { Panel } from './ui';

function ProgressTime({ value }: { value?: string | null }) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return <span className="opp-progress-time">Date unavailable</span>;
  return <time className="opp-progress-time" dateTime={date.toISOString()}>{date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })} IST</time>;
}

function ProgressDetails({ at, actor, actorLabel = 'By' }: { at?: string | null; actor?: DirectoryUser | null; actorLabel?: string }) {
  return <><ProgressTime value={at} /><span className="opp-progress-actor">{actor ? `${actorLabel} ${actor.name || actor.email}` : 'User unavailable'}</span></>;
}

// A stage is approved/completed when its successor is recorded, not when review starts.
const COMPLETIONS: Record<string, { stageId: number; label: string }> = {
  '2/4': { stageId: 1, label: 'Opportunity approved' },
  '3/7': { stageId: 2, label: 'Go approved' },
  '4/8': { stageId: 3, label: 'Estimation submitted' },
  '5/10': { stageId: 4, label: 'Estimation approved' },
};

function RevisionJourney({ history }: { history: OpportunityStageHistory[] }) {
  const [showOlder, setShowOlder] = useState(false);
  const requests = history.flatMap((event, index) => {
    if (event.stageId !== 4 || event.subStageId !== 5) return [];
    const decision = history[index + 1];
    const approved = decision?.stageId === 3 && decision.subStageId === 7;
    const declined = decision?.stageId === 6 && decision.subStageId === 12;
    return [{ event, decision: approved || declined ? decision : undefined, approved, declined }];
  }).reverse();
  if (!requests.length) return null;
  const latest = requests[0];
  // Approved revisions continue in the main timeline as another estimation cycle.
  if (latest.approved) return null;
  const title = latest.declined ? 'Revision request declined' : 'Revision approval pending';
  return <div className="opp-revision-journey">
    <div className="opp-revision-heading"><Undo2 size={16} aria-hidden="true" /><strong>{title}</strong></div>
    <details>
      <summary>Revision history ({requests.length})<ChevronDown size={14} aria-hidden="true" /></summary>
      <ol aria-label="Estimation revision requests">
        {(showOlder ? requests : requests.slice(0, 3)).map(({ event, decision, approved, declined }) => {
          const at = decision?.reachedAt ?? event.reachedAt;
          const date = new Date(at);
          return <li key={event.id} className={approved ? 'opp-journey-return' : undefined}>
            <span className="opp-journey-marker" aria-hidden="true"><Undo2 size={12} /></span>
            <span className="opp-revision-outcome" title={decision?.actor?.name}>{approved ? 'Approved → Estimation' : declined ? 'Declined → Negotiation' : 'Pending CEO approval'}</span>
            {Number.isFinite(date.getTime()) ? <time dateTime={date.toISOString()} title={date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>{date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit' })}</time> : <span>Date unavailable</span>}
          </li>;
        })}
      </ol>
      {requests.length > 3 && <button type="button" className="opp-revision-older" aria-expanded={showOlder} onClick={() => setShowOlder(value => !value)}>{showOlder ? 'Show latest 3' : 'Show ' + (requests.length - 3) + ' earlier requests'}</button>}
    </details>
  </div>;
}

export function OpportunityProgress({ opportunity: o }: { opportunity: OpportunityDetail }) {
  const history = [...(o.stageHistory ?? [])].sort((a, b) =>
    Date.parse(b.reachedAt) - Date.parse(a.reachedAt) || Number(b.id) - Number(a.id));
  const chronological = [...history].reverse();
  type Cycle = { events: OpportunityStageHistory[]; results: Map<number, { label: string; event: OpportunityStageHistory }> };
  const cycles: Cycle[] = [{ events: [], results: new Map() }];
  chronological.forEach((event, index) => {
    const completion = COMPLETIONS[`${event.stageId}/${event.subStageId}`];
    const previous = chronological[index - 1];
    if (event.stageId === 3 && event.subStageId === 7 && previous?.stageId === 4 && previous.subStageId === 5) {
      cycles.push({ events: [], results: new Map() });
    }
    const cycle = cycles[cycles.length - 1];
    cycle.events.push(event);
    const results = cycle.results;
    // Resubmitting or resuming the same review must not overwrite the approval time.
    if (completion && (!previous || previous.stageId === completion.stageId)) {
      results.set(completion.stageId, { label: completion.label, event });
    }
    // A resumed client follow-up is not a new proposal submission.
    if (event.stageId === 5 && event.subStageId === 11 && previous?.stageId !== 10 && !results.has(5)) {
      results.set(5, { label: 'Bid Submitted', event });
    }
    if ([7, 8].includes(event.stageId) && previous?.stageId === 6) {
      results.set(6, { label: 'Negotiation completed', event });
    }
    if (isOpportunityOutcome(event.stageId) && event.stageId === o.stageId && event.subStageId === o.subStageId) {
      results.set(7, { label: event.stageId === 10 ? 'On Hold' : opportunityStatus({ ...o, ...event }).substage ?? 'Outcome recorded', event });
    }
    if (event.stageId === 9) {
      results.set(9, { label: opportunityStatus({ ...o, ...event }).substage ?? 'Opportunity declined', event });
    }
  });
  // Keep each completed cycle before the next one. Future positions belong only
  // to the latest cycle; creation and qualification appear once at the beginning.
  const stages = cycles.flatMap((cycle, index) => {
    const latest = index === cycles.length - 1;
    const ids = [...new Set([...(index === 0 ? [1, 2] : []), 3, 4, 5, 6, 7,
      ...(latest && o.stageId != null ? [o.stageId] : []), ...cycle.events.map(event => event.stageId)]
      .map(id => isOpportunityOutcome(id) ? 7 : id))].sort((a, b) => a - b);
    return ids.filter(id => latest || id === 1 || (id === 7
      ? cycle.events.some(event => [7, 8].includes(event.stageId))
      : cycle.results.has(id) || cycle.events.some(event => event.stageId === id)))
      .map(id => ({ id, cycle, index, latest }));
  }).reverse();

  return <Panel title="Opportunity progress" tone="emerald" accentIcon className="opp-progress-panel">
    <div className="opp-progress-scroll" tabIndex={0} role="region" aria-label="Opportunity progress timeline">
    <RevisionJourney key={o.id} history={chronological} />
    {o.stageId == null ? <div className="opp-timeline-body"><h3>{opportunityStatus(o).stage}</h3><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} actorLabel="Created by" /></div> :
      <ol className="opp-stage-timeline" aria-label="Opportunity progress history">{stages.map(({ id, cycle, index, latest }) => {
        const outcome = id === 7;
        const events = cycle.events.filter(event => outcome ? isOpportunityOutcome(event.stageId) : event.stageId === id);
        const current = latest && (outcome ? isOpportunityOutcome(o.stageId) : id === o.stageId);
        const currentHasResult = outcome || id === 9 || id === 5 && o.subStageId === 11;
        const result = !current || currentHasResult ? cycle.results.get(id) : undefined;
        const substage = outcome && o.stageId === 10 ? 'On Hold' : opportunityStatus(o).substage ?? 'Status unavailable';
        const reached = current || Boolean(result) || !outcome && events.length > 0 || id === 1;
        const name = outcome ? OPPORTUNITY_OUTCOME_LABEL : STAGE_LABELS[id] ?? 'Status unavailable';
        return <li key={`${index}-${id}`} className={`opp-timeline-stage ${current ? 'current' : reached ? 'reached' : 'upcoming'}`} aria-current={current ? 'step' : undefined}>
          <span className="opp-timeline-marker" aria-hidden="true">{reached && !current ? <Check size={13} /> : <span className="opp-timeline-dot" />}</span>
          <div className="opp-timeline-body">
            <div className="opp-timeline-heading"><h3>{name}</h3>{current && <span className="opp-timeline-state">Current</span>}</div>
            {result && <div className={current ? 'opp-substage-current' : 'opp-stage-completion'}><strong>{result.label}</strong><ProgressDetails at={result.event.reachedAt} actor={result.event.actor} /></div>}
            {current && !result && <div className="opp-substage-current"><strong>{substage}</strong>{currentHasResult && <ProgressDetails />}</div>}
            {id === 1 && <div className="opp-stage-completion opp-progress-created"><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} actorLabel="Created by" /></div>}
          </div>
        </li>;
      })}</ol>}
    </div>
  </Panel>;
}
