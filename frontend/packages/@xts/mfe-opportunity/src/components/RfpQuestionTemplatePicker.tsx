import { useId, useState } from 'react';
import type { RfpQuestion } from '@xts/api-contracts';
import { Button, Checkbox, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@xts/design-system';
import { useRfpQuestionTemplates } from '../hooks/useRfpQuestionTemplates';
import { Loading, Notice } from './ui';

export interface RfpQuestionTemplatePickerProps {
  disabled?: boolean;
  alreadySelectedIds?: number[];
  onAdd: (selected: RfpQuestion[]) => void;
}

export function RfpQuestionTemplatePicker({ disabled = false, alreadySelectedIds = [], onAdd }: RfpQuestionTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const searchId = useId();
  const { questions, loading, error, retry } = useRfpQuestionTemplates(open);
  const existingIds = new Set(alreadySelectedIds);
  const selected = questions.filter(question => selectedIds.includes(question.id) && !existingIds.has(question.id));
  const term = search.trim().toLocaleLowerCase();
  const visible = questions.filter(question => `${question.question} ${question.description ?? ''}`.toLocaleLowerCase().includes(term));

  function changeOpen(next: boolean) {
    setOpen(next);
    setSearch('');
    setSelectedIds([]);
  }

  function addSelected() {
    if (disabled || loading || error || !selected.length) return;
    onAdd(selected);
    changeOpen(false);
  }

  return <Sheet open={open} onOpenChange={changeOpen}>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => changeOpen(true)}>Add from Question Master</Button>
    <SheetContent className="opp-drawer flex w-full flex-col sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Add from Question Master</SheetTitle>
        <SheetDescription>Choose standard questions for this opportunity. You can edit each question after adding it.</SheetDescription>
      </SheetHeader>
      <div className="space-y-1.5">
        <Label htmlFor={searchId}>Search master questions</Label>
        <Input id={searchId} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search question text or description" disabled={disabled} />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2" aria-busy={loading}>
        {error ? <Notice title="Question Master unavailable" error={error} retry={retry} />
          : loading && !questions.length ? <Loading label="Loading master questions..." />
            : !questions.length ? <div className="opp-empty" role="status">No active master questions are available.</div>
              : <>
                {loading && <p role="status" className="text-sm text-muted-foreground">Refreshing master questions...</p>}
                {!visible.length ? <div className="opp-empty" role="status">No master questions match your search.</div>
                  : visible.map(question => {
                    const existing = existingIds.has(question.id);
                    return <Label key={question.id} className={`opp-section ${selectedIds.includes(question.id) || existing ? 'opp-selected' : ''}`}>
                      <Checkbox
                        checked={existing || selectedIds.includes(question.id)}
                        disabled={disabled || existing || loading}
                        aria-label={question.question}
                        onCheckedChange={checked => setSelectedIds(ids => checked === true ? [...new Set([...ids, question.id])] : ids.filter(id => id !== question.id))}
                      />
                      <span className="min-w-0 break-words">
                        <strong className="block">{question.question}</strong>
                        {question.description && <small className="mt-1 block font-normal text-muted-foreground">{question.description}</small>}
                        {existing && <small className="mt-1 block font-normal text-muted-foreground">Already added to this opportunity</small>}
                      </span>
                    </Label>;
                  })}
              </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">{selected.length} selected</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="button" disabled={disabled || loading || Boolean(error) || !selected.length} onClick={addSelected}>Add selected questions</Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>;
}
