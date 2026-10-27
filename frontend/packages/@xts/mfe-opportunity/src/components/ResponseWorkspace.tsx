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
  // The backend grants answer access after checking opportunity visibility.
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

  return <Panel title={response.title} description={response.sourceReference ?? undefined} tone="indigo" className="break-words">
    {formDirty && editable && <p className="opp-notice mb-3">Save opportunity edits before saving an answer. Your draft remains here.</p>}
    <div className="space-y-2">
      <Label htmlFor={answerId}>Answer</Label>
      <Textarea id={answerId} rows={9} className="min-h-48" value={editable ? answer : response.answer}
        readOnly={!editable} disabled={mutation.saving || formDirty} maxLength={100000}
        placeholder={editable ? 'Type your answer to this question…' : 'No answer saved yet.'}
        onChange={event => { if (editable) setAnswer(event.target.value); }} />
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{editable ? dirty ? 'Unsaved answer' : response.answer.trim() ? 'Answer saved' : 'No answer saved yet.' : 'Read-only. You do not have access to edit this answer.'}</p>
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
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const questionsId = useId();
  const confirm = useUnsaved(false);
  const responses = opportunity.responses ?? [];
  const questionnaire = opportunity.form.rfp.type === 'QUESTIONNAIRE';
  const groups = new Map<string, ResponseItem[]>();
  if (questionnaire) responses.forEach(response => {
    const category = response.category?.trim() || response.sourceReference?.trim() || 'Other';
    groups.set(category, [...(groups.get(category) ?? []), response]);
  });
  const activeCategory = selectedCategory && groups.has(selectedCategory) ? selectedCategory : groups.keys().next().value;
  const visible = questionnaire ? activeCategory ? groups.get(activeCategory)! : [] : responses;
  const selected = visible.find(response => response.id === selectedId) ?? visible[0];
  function question(response: ResponseItem, index: number) {
    return <Button key={response.id} type="button" variant="outline"
      className={`opp-task ${selected?.id === response.id ? 'opp-selected' : ''}`} aria-pressed={selected?.id === response.id}
      onClick={async () => { if (selected?.id !== response.id && await confirm()) setSelectedId(response.id); }}>
      <span><strong className="block">{index + 1}. {response.title}</strong>
        <Badge variant={response.answer.trim() ? 'success' : 'secondary'} className="mt-2">{response.answer.trim() ? 'Answered' : 'Not answered'}</Badge>
      </span>
    </Button>;
  }
  return <div className="opp-assignment">
    <Panel title="Opportunity questions" description={`${responses.length} questions saved for this opportunity`} tone="violet">
      <div className="space-y-3">{questionnaire ? <>
        <div role="group" aria-label="Question categories" className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {Array.from(groups, ([category, items]) => <Button key={category} type="button" variant="outline"
            className={`h-auto min-h-11 min-w-0 justify-between gap-2 whitespace-normal px-3 py-2 text-left ${activeCategory === category ? 'opp-selected' : ''}`}
            aria-pressed={activeCategory === category} aria-controls={questionsId}
            onClick={async () => {
              if (activeCategory !== category && await confirm()) { setSelectedCategory(category); setSelectedId(undefined); }
            }}>
            <span className="min-w-0 break-words">{category}</span><Badge variant="secondary" className="shrink-0">{items.length}</Badge>
          </Button>)}
        </div>
        {activeCategory && <section id={questionsId} key={activeCategory} aria-label={`${activeCategory} questions`} tabIndex={0}
          className="min-w-0 overflow-y-auto overscroll-contain rounded-lg border bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          style={{ maxHeight: 'min(50vh, 480px)', scrollbarGutter: 'stable' }}>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-3 py-2"><h3 className="text-sm font-semibold">{activeCategory}</h3><span className="text-xs text-muted-foreground">{visible.length} questions</span></div>
          <div className="space-y-2 p-2">{visible.map(question)}</div>
        </section>}
      </> : responses.map(question)}
        {!responses.length && <p className="opp-empty">No questions have been saved for this opportunity. Add questions when creating or editing the opportunity.</p>}
      </div>
    </Panel>
    {selected ? <ResponseEditor key={`${opportunity.id}:${selected.id}`} opportunity={opportunity} response={selected} onSaved={onSaved}
      formDirty={formDirty} readOnly={readOnly} onDirtyChange={onDirtyChange} />
      : <Panel title="Question & answer" tone="indigo"><p className="text-sm text-muted-foreground">Saved opportunity questions and answers will appear here.</p></Panel>}
  </div>;
}
