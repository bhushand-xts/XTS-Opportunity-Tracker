import { useEffect, useId, useState } from 'react';
import { Badge, Button, Label, Textarea } from '@xts/design-system';
import type { OpportunityDetail, ResponseItem } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { Notice, Panel } from './ui';

function ResponseEditor({ opportunity, response, onSaved, formDirty, readOnly, onDirtyChange }: {
  opportunity: OpportunityDetail; response: ResponseItem; onSaved: (saved: OpportunityDetail) => void;
  formDirty: boolean; readOnly: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const service = useOpportunityService(), mutation = useSave(), answerId = useId();
  const [answer, setAnswer] = useState(response.answer);
  const [baseline, setBaseline] = useState({ answer: response.answer, revision: response.revision });
  // This grant is issued by the backend only for the active Estimation Team role.
  const editable = !readOnly && response.allowedActions.includes('SAVE_ANSWER');
  const dirty = editable && answer !== baseline.answer;
  useUnsaved(dirty);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) {
      setAnswer(response.answer);
      setBaseline({ answer: response.answer, revision: response.revision });
    }
  }, [response.answer, response.revision, dirty]);

  async function save() {
    if (!editable || formDirty || mutation.saving || !dirty) return;
    await mutation.run(JSON.stringify({ id: response.id, revision: baseline.revision, answer }), key => service.answer({
      opportunityId: opportunity.id, expectedRevision: opportunity.revision, idempotencyKey: key,
      responseId: response.id, responseRevision: baseline.revision, answer, submit: false,
    }), saved => {
      const updated = saved.responses?.find(item => item.id === response.id);
      if (!updated) throw new Error('The saved question could not be reloaded. Refresh the opportunity.');
      setAnswer(updated.answer);
      setBaseline({ answer: updated.answer, revision: updated.revision });
      onSaved(saved);
    }, 'Answer saved.');
  }

  return <Panel title={response.title} description={response.sourceReference ?? undefined} tone="indigo">
    {formDirty && editable && <p className="opp-notice mb-3">Save opportunity edits before saving an answer. Your draft remains here.</p>}
    <div className="space-y-2">
      <Label htmlFor={answerId}>Answer</Label>
      <Textarea id={answerId} rows={9} className="min-h-48" value={editable ? answer : response.answer}
        readOnly={!editable} disabled={mutation.saving || formDirty} maxLength={100000}
        placeholder={editable ? 'Type your answer to this question…' : 'No answer saved yet.'}
        onChange={event => { if (editable) setAnswer(event.target.value); }} />
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{editable ? dirty ? 'Unsaved answer' : response.answer.trim() ? 'Answer saved' : 'No answer saved yet.' : 'Read-only. Only the Estimation Team can answer questions.'}</p>
      {editable && <Button type="button" disabled={formDirty || mutation.saving || !dirty} onClick={() => void save()}>{mutation.saving ? 'Saving…' : 'Save answer'}</Button>}
    </div>
    {mutation.error && <div className="mt-3"><Notice error={mutation.error} /></div>}
  </Panel>;
}

export function ResponseWorkspace({ opportunity, onSaved, formDirty = false, readOnly = false, onDirtyChange }: {
  opportunity: OpportunityDetail; onSaved: (saved: OpportunityDetail) => void;
  formDirty?: boolean; readOnly?: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const confirm = useUnsaved(false);
  const responses = opportunity.responses ?? [];
  const selected = responses.find(response => response.id === selectedId) ?? responses[0];
  return <div className="opp-assignment">
    <Panel title="Opportunity questions" description={`${responses.length} questions saved for this opportunity`} tone="violet">
      <div className="space-y-2">{responses.map((response, index) => <Button key={response.id} type="button" variant="outline"
        className={`opp-task ${selected?.id === response.id ? 'opp-selected' : ''}`} aria-pressed={selected?.id === response.id}
        onClick={async () => { if (selected?.id !== response.id && await confirm()) setSelectedId(response.id); }}>
        <span><strong className="block">{index + 1}. {response.title}</strong>
          <Badge variant={response.answer.trim() ? 'success' : 'secondary'} className="mt-2">{response.answer.trim() ? 'Answered' : 'Not answered'}</Badge>
        </span>
      </Button>)}
        {!responses.length && <p className="opp-empty">No questions have been saved for this opportunity. Add questions when creating or editing the opportunity.</p>}
      </div>
    </Panel>
    {selected ? <ResponseEditor key={`${opportunity.id}:${selected.id}`} opportunity={opportunity} response={selected} onSaved={onSaved}
      formDirty={formDirty} readOnly={readOnly} onDirtyChange={onDirtyChange} />
      : <Panel title="Question & answer" tone="indigo"><p className="text-sm text-muted-foreground">Saved opportunity questions and answers will appear here.</p></Panel>}
  </div>;
}
