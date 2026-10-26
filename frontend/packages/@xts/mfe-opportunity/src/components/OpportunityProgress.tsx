import { Check } from 'lucide-react';
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

function ProgressDetails({ at, actor }: { at?: string | null; actor?: DirectoryUser | null }) {
  return <><ProgressTime value={at} /><span className="opp-progress-actor">{actor ? `By ${actor.name || actor.email}` : 'User unavailable'}</span></>;
}

// A stage is approved/completed when its successor is recorded, not when review starts.
const COMPLETIONS: Record<string, { stageId: number; label: string }> = {
  '2/4': { stageId: 1, label: 'Opportunity approved' },
  '3/7': { stageId: 2, label: 'Go approved' },
  '4/8': { stageId: 3, label: 'Estimation submitted' },
  '5/10': { stageId: 4, label: 'Estimation approved' },
};

export function OpportunityProgress({ opportunity: o }: { opportunity: OpportunityDetail }) {
  const history = [...(o.stageHistory ?? [])].sort((a, b) =>
    Date.parse(b.reachedAt) - Date.parse(a.reachedAt) || Number(b.id) - Number(a.id));
  const chronological = [...history].reverse();
  const results = new Map<number, { label: string; event: OpportunityStageHistory }>();
  chronological.forEach((event, index) => {
    const completion = COMPLETIONS[`${event.stageId}/${event.subStageId}`];
    const previous = chronological[index - 1];
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
  // Outcome choices share one position after Negotiation; only recorded choices have details.
  const stageIds = [...new Set([1, 2, 3, 4, 5, 6, 7, ...(o.stageId != null ? [o.stageId] : []), ...history.map(event => event.stageId)]
    .map(id => isOpportunityOutcome(id) ? 7 : id))].sort((a, b) => b - a);

  return <Panel title="Opportunity progress" tone="violet" className="opp-progress-panel">
    {o.stageId == null ? <div className="opp-timeline-body"><h3>{opportunityStatus(o).stage}</h3><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} /></div> :
      <ol className="opp-stage-timeline" aria-label="Opportunity progress history">{stageIds.map(id => {
        const outcome = id === 7;
        const events = history.filter(event => outcome ? isOpportunityOutcome(event.stageId) : event.stageId === id);
        const current = outcome ? isOpportunityOutcome(o.stageId) : id === o.stageId;
        const currentHasResult = outcome || id === 9 || id === 5 && o.subStageId === 11;
        const result = !current || currentHasResult ? results.get(id) : undefined;
        const substage = outcome && o.stageId === 10 ? 'On Hold' : opportunityStatus(o).substage ?? 'Status unavailable';
        const reached = current || Boolean(result) || !outcome && events.length > 0 || id === 1;
        const name = outcome ? OPPORTUNITY_OUTCOME_LABEL : STAGE_LABELS[id] ?? 'Status unavailable';
        return <li key={id} className={`opp-timeline-stage ${current ? 'current' : reached ? 'reached' : 'upcoming'}`} aria-current={current ? 'step' : undefined}>
          <span className="opp-timeline-marker" aria-hidden="true">{reached && !current ? <Check size={13} /> : <span className="opp-timeline-dot" />}</span>
          <div className="opp-timeline-body">
            <div className="opp-timeline-heading"><h3>{name}</h3>{current && <span className="opp-timeline-state">Current</span>}</div>
            {result && <div className={current ? 'opp-substage-current' : 'opp-stage-completion'}><strong>{result.label}</strong><ProgressDetails at={result.event.reachedAt} actor={result.event.actor} /></div>}
            {current && !result && <div className="opp-substage-current"><strong>{substage}</strong>{currentHasResult && <ProgressDetails />}</div>}
            {id === 1 && <div className="opp-stage-completion opp-progress-created"><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} /></div>}
          </div>
        </li>;
      })}</ol>}
  </Panel>;
}
