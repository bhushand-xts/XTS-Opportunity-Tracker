import { useId, useState } from 'react';
import { ChevronRight, ListFilter } from 'lucide-react';
import type { PreparedQuestion } from '@xts/api-contracts';

export function QuestionViewer({ questions }: { questions: PreparedQuestion[] }) {
  const headingId = useId();
  const [category, setCategory] = useState<string | null>(null);
  const groups = new Map<string, PreparedQuestion[]>();
  questions.forEach(question => {
    const name = question.category?.trim() || 'Other';
    groups.set(name, [...(groups.get(name) ?? []), question]);
  });
  const activeCategory = category && groups.has(category) ? category : null;
  const visible = activeCategory ? groups.get(activeCategory)! : [];

  return <section className="opp-question-viewer mt-3 min-w-0 overflow-hidden rounded-xl border border-indigo-100 bg-white" aria-labelledby={headingId}>
    <div className="space-y-2 border-b border-indigo-100 bg-indigo-50/50 p-2.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-indigo-600"><ListFilter className="size-4" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2"><h3 id={headingId} className="text-sm font-semibold">Added questions</h3><p className="text-xs text-muted-foreground">{questions.length} questions across {groups.size} categories</p></div>
      </div>
      {questions.length > 0 && <div className="opp-question-categories grid max-h-60 grid-cols-1 gap-1.5 overflow-y-auto p-0.5" role="group" aria-label="Question categories">
        {Array.from(groups, ([name, items]) => <button key={name} type="button" aria-pressed={activeCategory === name} aria-controls={`${headingId}-questions`} onClick={() => setCategory(name)} className={`flex min-h-8 min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${activeCategory === name ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-indigo-100 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
          <span className="min-w-0 flex-1 break-words font-medium">{name}</span><span className="shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">{items.length}</span><ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        </button>)}
      </div>}
    </div>
    <div id={`${headingId}-questions`}>
      {questions.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No questions added.</p> : activeCategory ? <>
        <div key={activeCategory} role="region" aria-label={`${activeCategory} questions`} tabIndex={0} className="min-w-0 overflow-y-auto overscroll-contain bg-slate-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400" style={{ maxHeight: 'min(55vh, 560px)', scrollbarGutter: 'stable', scrollPaddingTop: '40px' }}>
          <h4 className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-900"><span>{activeCategory}</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-indigo-600">{visible.length} {visible.length === 1 ? 'question' : 'questions'}</span></h4>
          <ol className="space-y-1.5 p-2.5">{visible.map((question, index) => <li key={question.id} value={index + 1} className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 px-1 text-xs font-semibold text-indigo-600" aria-label={`Question ${index + 1}`}>{index + 1}</span>
            <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">{question.text}</p>
          </li>)}</ol>
        </div>
        {/* <div className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100 px-2.5 py-1.5 text-xs text-muted-foreground"><span role="status">{visible.length} questions in {activeCategory}</span><span>Scroll to read more</span></div> */}
      </> : <div className="p-4 text-center"><ListFilter className="mx-auto mb-1.5 size-5 text-indigo-300" aria-hidden="true" /><p className="text-sm font-medium text-slate-700">Select a category to view its questions</p></div>}
    </div>
  </section>;
}
