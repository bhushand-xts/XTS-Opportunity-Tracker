import { Check } from 'lucide-react';
import type { DirectoryUser, OpportunityDetail } from '@xts/api-contracts';
import { opportunityStatus, STAGE_LABELS } from '../lib/opportunityStatus';
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
  '6/12': { stageId: 5, label: 'Moved to negotiation' },
  '7/13': { stageId: 6, label: 'Won' },
  '8/14': { stageId: 6, label: 'Lost' },
};

export function OpportunityProgress({ opportunity: o }: { opportunity: OpportunityDetail }) {
  const history = [...(o.stageHistory ?? [])].sort((a, b) =>
    Date.parse(b.reachedAt) - Date.parse(a.reachedAt) || Number(b.id) - Number(a.id));
  const latest = history[0];
  const currentRecorded = Boolean(latest && latest.stageId === o.stageId && latest.subStageId === o.subStageId);
  const chronological = [...history].reverse();
  const completions = chronological.flatMap((event, index) => {
    const completion = COMPLETIONS[`${event.stageId}/${event.subStageId}`];
    const previous = chronological[index - 1];
    // Resubmitting or resuming the same review must not overwrite the approval time.
    return completion && (!previous || previous.stageId === completion.stageId) ? [{ ...completion, event }] : [];
  });
  const stageIds = [...new Set([1, 2, 3, 4, 5, 6, ...(o.stageId != null ? [o.stageId] : []), ...history.map(event => event.stageId)])].sort((a, b) => b - a);

  return <Panel title="Opportunity progress" tone="violet" className="opp-progress-panel">
    {o.stageId == null ? <div className="opp-timeline-body"><h3>{opportunityStatus(o).stage}</h3><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} /></div> :
      <ol className="opp-stage-timeline" aria-label="Opportunity progress history">{stageIds.map(id => {
        const events = history.filter(event => event.stageId === id);
        const current = id === o.stageId;
        const completion = completions.filter(item => item.stageId === id).slice(-1)[0];
        const reached = current || Boolean(completion) || events.length > 0 || id === 1 && Boolean(o.createdDt);
        const name = STAGE_LABELS[id] ?? 'Status unavailable';
        return <li key={id} className={`opp-timeline-stage ${current ? 'current' : reached ? 'reached' : 'upcoming'}`} aria-current={current ? 'step' : undefined}>
          <span className="opp-timeline-marker" aria-hidden="true">{reached && !current ? <Check size={13} /> : <span className="opp-timeline-dot" />}</span>
          <div className="opp-timeline-body">
            <div className="opp-timeline-heading"><h3>{name}</h3>{current && <span className="opp-timeline-state">Current</span>}</div>
            {completion && <div className="opp-stage-completion"><strong>{completion.label}</strong><ProgressDetails at={completion.event.reachedAt} actor={completion.event.actor} /></div>}
            {current && !currentRecorded && <div className="opp-substage-current"><strong>{opportunityStatus(o).substage ?? 'Status unavailable'}</strong><ProgressDetails /></div>}
            {(events.length > 0 || id === 1 && o.createdDt) && <ol className="opp-substage-history" aria-label={`${name} history`}>{events.map(event => {
              const active = currentRecorded && event.id === latest.id;
              const { substage } = opportunityStatus({ state: o.state, stageId: event.stageId, subStageId: event.subStageId });
              return <li key={event.id} className={active ? 'active' : undefined}>
                <strong>{substage}</strong>
                {completions.some(item => item.stageId === 1 && item.event.id === event.id) && <span className="opp-progress-detail-label">Opportunity approved</span>}
                <ProgressDetails at={event.reachedAt} actor={event.actor} />
              </li>;
            })}{id === 1 && o.createdDt && <li className="opp-progress-created"><strong>Opportunity created</strong><ProgressDetails at={o.createdDt} actor={o.createdBy} /></li>}</ol>}
          </div>
        </li>;
      })}</ol>}
  </Panel>;
}
