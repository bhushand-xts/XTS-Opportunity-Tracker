import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, ChevronLeft, ChevronRight, FileText, MessageCircle, Search, Trash2, X } from 'lucide-react';
import { Button, buttonVariants, Checkbox, cn, Input, Label, Progress, Spinner, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xts/design-system';
import type {
  OpportunityDetail,
  OpportunityDraft,
  PreparedQuestion,
  QuestionExtractionStatus,
  RfpDraft,
  Solicitation,
  ImportantDates,
  SourceDocument,
} from '@xts/api-contracts';
import { gql, useQuery } from '@apollo/client';
import { useFieldError } from './FieldValidation';
import {
  extractionCandidateKeys,
  extractionEnabled,
  extractionError,
  extractionProgress,
  instructionsTooShort,
  mergeExtractedQuestions,
  pollDelay,
  questionExtractionService,
  ExtractionRequestError,
  MAX_INSTRUCTIONS,
} from '../services/QuestionExtractionService';
import { useOpportunityService } from '../services/OpportunityService';
import { randomUUID } from '../lib/uuid';
import { DocumentDownload } from './DocumentDownload';
export const GET_PROPOSAL_SECTIONS = gql`query OpportunityProposalSections { rfpQuestionsList { id question description displayOrder isActive } }`;
import { Choice, Field, Notice } from './ui';

const extractedQuestion = (question: PreparedQuestion) => question.id.startsWith('extracted-');
// Same fixed list the backend asks the AI to choose from, in tab order.
const QUESTION_CATEGORIES = ['Company & Qualifications', 'Team', 'Approach & Delivery', 'Technical', 'Security & Compliance', 'Pricing & Commercial', 'References', 'Other'];
const normalizeQuestion = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
/** Shifts an ISO (YYYY-MM-DD) date by `days`; used to cap the native date pickers so Questions due can't land on or after Submission deadline. */
function shiftDate(value: string, days: number): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function extractionState(state: QuestionExtractionStatus['state']): NonNullable<RfpDraft['extraction']>['state'] {
  if (state === 'SUCCEEDED') return 'SUCCEEDED';
  if (state === 'QUEUED' || state === 'PROCESSING') return 'PROCESSING';
  return 'FAILED';
}
function extractionPercent(status: QuestionExtractionStatus | undefined): number {
  if (!status) return 0;
  return Math.min(100, Math.round((status.completed / Math.max(status.total, 1)) * 100));
}

export function RfpPreparation({ form, setForm, saved, disabled: readOnly, onUploadingChange, onExtractingChange }: { form: OpportunityDraft; setForm: Dispatch<SetStateAction<OpportunityDraft>>; saved?: OpportunityDetail; disabled: boolean; onUploadingChange?: (uploading: boolean) => void; onExtractingChange?: (extracting: boolean) => void }) {
  const [error, setError] = useState<string>(), [selectedFile, setSelectedFile] = useState<File>();
  const [job, setJob] = useState<{ id: string; documentId: string }>();
  const [status, setStatus] = useState<QuestionExtractionStatus>();
  // The document uploaded in this session; extraction needs its server id.
  const [uploaded, setUploaded] = useState<SourceDocument>();
  const [uploading, setUploading] = useState(false);
  const service = useOpportunityService();
  const uploadPending = useRef(false);
  const mounted = useRef(true);
  const disabled = readOnly || uploading;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onUploadingChange?.(false); };
  }, [onUploadingChange]);
  const [instructions, setInstructions] = useState(''), [instructionsError, setInstructionsError] = useState<string>();
  const [questionTab, setQuestionTab] = useState(''), [showInstructions, setShowInstructions] = useState(false);
  // Searches across every category, not just the active tab — the tabbed panel only renders
  // the active tab's questions, so browser find-in-page can't reach the others.
  const [questionSearch, setQuestionSearch] = useState('');
  // When checked, the file's own questions are copied verbatim via deterministic local rules; no AI
  // is used and no extraction instructions apply.
  const asIs = form.rfp.questionnaireTypeId === 2;
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const rfpTypeError = useFieldError('RFP type');
  // Always read the latest form/disabled from async extraction callbacks, never a stale closure.
  const formRef = useRef(form); formRef.current = form;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController>();
  const removedRef = useRef(new Set<string>());
  const hasExtractedRef = useRef(Boolean(saved?.id || form.rfp.extraction));
  const replaceOnNextResultRef = useRef(false);
  // The server-side job this form started and hasn't seen finish. Results are only ever
  // applied to this open form, so once it stops watching, the job is cancelled to free the
  // user's pending-extraction slot.
  const runningRef = useRef<{ id: string; documentId: string }>();
  function cancelRunning() {
    const running = runningRef.current;
    if (!running) return;
    runningRef.current = undefined;
    questionExtractionService.cancel(running.documentId, running.id).catch(() => {});
  }
  useEffect(() => {
    // Closing the tab doesn't unmount React components; pagehide still fires.
    window.addEventListener('pagehide', cancelRunning);
    return () => {
      window.removeEventListener('pagehide', cancelRunning);
      abortRef.current?.abort(); cancelRunning();
    };
  }, []);
  const extracting = Boolean(job) && (!status || status.state === 'QUEUED' || status.state === 'PROCESSING');
  // The form is locked while extraction runs. Kept apart from `disabled`, which would stop results merging.
  const locked = disabled || extracting;
  useEffect(() => { onExtractingChange?.(extracting); }, [extracting, onExtractingChange]);
  useEffect(() => () => onExtractingChange?.(false), [onExtractingChange]);
  // Saved questions keep only their text. On reopening, categories (and whether a question came
  // from the document) are recovered from the stored extraction. Kept out of the form so
  // reopening never counts as an unsaved change.
  const [restored, setRestored] = useState({ categories: new Map<string, string>(), fromDocument: new Set<string>() });
  useEffect(() => {
    if (!saved?.id || !extractionEnabled || form.rfp.type !== 'QUESTIONNAIRE') return;
    let active = true;
    const generation = generationRef.current;
    questionExtractionService.source(saved.id).then(result => {
      if (!active || generationRef.current !== generation) return;
      const byText = new Map((result.categories ?? []).map(entry => [normalizeQuestion(entry.text), entry]));
      const categories = new Map<string, string>(), fromDocument = new Set<string>();
      for (const question of formRef.current.rfp.questions) {
        const match = byText.get(normalizeQuestion(question.text));
        if (!match) continue;
        if (!question.category) categories.set(question.id, match.category);
        if (match.fromDocument) fromDocument.add(question.id);
      }
      setRestored({ categories, fromDocument });
      // The linked document lets Extract run without choosing the file again, unless a new file was picked meanwhile.
      if (result.document && generationRef.current === generation) setUploaded(current => current ?? result.document!);
    }).catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id]);
  // A new manual question stays in the tab it was added from until its section is chosen.
  const draftTabs = useRef(new Map<string, string>());
  const focusQuestionId = useRef<string>();
  const chosenCategory = (question: PreparedQuestion) => question.category ?? restored.categories.get(question.id);
  // A category can be any non-empty string, not just one of the fixed list: "Questions as
  // Written" keeps the source file's own section names verbatim (see directQuestions on the
  // server), so e.g. "Information Security and Compliance" becomes its own tab rather than
  // being forced into "Other" or re-bucketed onto a similarly-named fixed category.
  const categoryOf = (question: PreparedQuestion) => {
    const category = chosenCategory(question) ?? draftTabs.current.get(question.id);
    return category?.trim() || 'Other';
  };
  // Recognize extracted questions after reopening for their category controls and replacement flow.
  const fromDocument = (question: PreparedQuestion) => extractedQuestion(question) || restored.fromDocument.has(question.id);
  useEffect(() => {
    if (!status || disabledRef.current) return;
    const incoming = status.questions.filter(q => !removedRef.current.has(q.id) && !removedRef.current.has(extractionCandidateKeys(q)[1]));
    const current = formRef.current;
    // Wait for usable results before replacing a saved set, so a failed retry keeps it intact.
    if (replaceOnNextResultRef.current && !incoming.length && status.state !== 'SUCCEEDED') return;
    const questions = mergeExtractedQuestions(replaceOnNextResultRef.current ? [] : current.rfp.questions, incoming);
    replaceOnNextResultRef.current = false;
    if (incoming.length || status.state === 'SUCCEEDED') hasExtractedRef.current = true;
    const extraction = { id: status.id, error: status.error, state: extractionState(status.state) };
    setForm({ ...current, rfp: { ...current.rfp, questions, extraction } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, disabled]);
  async function poll(jobId: string, generation: number, signal: AbortSignal) {
    let failures = 0;
    while (generationRef.current === generation && !signal.aborted) {
      let response: QuestionExtractionStatus;
      try { response = await questionExtractionService.status(jobId, signal); failures = 0; }
      catch (failure) {
        if (signal.aborted) return;
        if (++failures >= 3) { setError(failure instanceof ExtractionRequestError ? failure.message : extractionError('EXTRACTION_UNAVAILABLE')); return; }
        await pollDelay(1500 * failures, signal); continue;
      }
      if (generationRef.current !== generation) return;
      if (response.id !== jobId) { setError('Extraction status did not match the active job.'); return; }
      if (response.deadlineAt && new Date(response.deadlineAt).getTime() < Date.now()) { setError(extractionError('EXTRACTION_DEADLINE_EXCEEDED')); return; }
      if (response.state === 'FAILED') setError(extractionError(response.error || 'EXTRACTION_UNAVAILABLE'));
      setStatus(response);
      if (response.state === 'SUCCEEDED' || response.state === 'FAILED' || response.state === 'PARTIAL') {
        if (runningRef.current?.id === jobId) runningRef.current = undefined;
        return;
      }
      await pollDelay(400, signal);
    }
  }
  // Cancels any upload/extraction in flight and returns a fresh signal and generation for the next one.
  function restart() {
    abortRef.current?.abort();
    cancelRunning();
    const controller = new AbortController(); abortRef.current = controller;
    removedRef.current = new Set();
    replaceOnNextResultRef.current = false;
    setJob(undefined); setStatus(undefined); setError(undefined);
    return { controller, generation: ++generationRef.current };
  }
  const failureMessage = (failure: unknown) => failure instanceof ExtractionRequestError ? failure.message : extractionError('EXTRACTION_UNAVAILABLE');
  async function uploadDocument(file: File) {
    const { controller, generation } = restart();
    setUploaded(undefined); setUploading(true);
    uploadPending.current = true; onUploadingChange?.(true);
    try {
      const { document } = await questionExtractionService.upload(file, saved?.id, controller.signal);
      if (!mounted.current || generationRef.current !== generation) return;
      setUploaded(document);
      const current = formRef.current;
      setForm({ ...current, rfp: { ...current.rfp, source: document, extraction: null } });
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted) setError(failureMessage(failure));
    } finally {
      if (generationRef.current === generation) {
        uploadPending.current = false;
        if (mounted.current) { setUploading(false); setSelectedFile(undefined); onUploadingChange?.(false); }
      }
    }
  }
  async function extractQuestions() {
    if (!uploaded || disabled || uploadPending.current || extracting) return;
    // Instructions are optional: empty extracts every question. Typed text must still mean something.
    // As-is mode ignores instructions entirely, so this check doesn't apply to it.
    if (!asIs && instructions.trim() && instructionsTooShort(instructions.trim())) {
      setShowInstructions(true);
      setInstructionsError("Describe what to extract in a few words, e.g. 'pricing and technical questions', or clear the box to extract all questions.");
      setTimeout(() => instructionsRef.current?.focus());
      return;
    }
    setInstructionsError(undefined);
    const replacing = hasExtractedRef.current || rfp.questions.some(fromDocument);
    if (replacing && rfp.questions.length && !window.confirm('Extract again? All current questions, including manually added questions, will be replaced.')) return;
    const { controller, generation } = restart();
    replaceOnNextResultRef.current = replacing;
    try {
      const accepted = await questionExtractionService.retry(uploaded.id, randomUUID(), controller.signal, asIs ? undefined : instructions, asIs ? 'AS_IS' : undefined);
      if (generationRef.current !== generation) return;
      runningRef.current = { id: accepted.jobId, documentId: accepted.document.id };
      setJob({ id: accepted.jobId, documentId: accepted.document.id });
      const current = formRef.current;
      setForm({ ...current, rfp: { ...current.rfp, extraction: { id: accepted.jobId, state: 'PROCESSING', error: null } } });
      await poll(accepted.jobId, generation, controller.signal);
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted) setError(failureMessage(failure));
    }
  }
  const { data, loading, error: sectionsError } = useQuery<{ rfpQuestionsList: ({ id: number; question: string; displayOrder: number | null; isActive: boolean } | null)[] }>(GET_PROPOSAL_SECTIONS, { skip: form.rfp.type !== 'GENERIC' });
  const sections = (data?.rfpQuestionsList ?? []).filter((s): s is NonNullable<typeof s> => s !== null && s.isActive).sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.id - b.id);
  const rfp = form.rfp;
  const update = (patch: Partial<RfpDraft>) => setForm({ ...form, rfp: { ...rfp, ...patch } });
  function solicitation<K extends keyof Solicitation>(key: K, value: Solicitation[K]) { setForm({ ...form, solicitation: { ...form.solicitation, [key]: value } }); }
  function date<K extends keyof ImportantDates>(key: K, value: ImportantDates[K]) { setForm({ ...form, dates: { ...form.dates, [key]: value } }); }
  function choose(type: RfpDraft['type']) {
    const current = formRef.current;
    if (disabled || uploadPending.current || type === current.rfp.type) return;
    generationRef.current++;
    abortRef.current?.abort(); abortRef.current = undefined; cancelRunning();
    setSelectedFile(undefined); setUploaded(undefined); setJob(undefined); setStatus(undefined); setError(undefined);
    setInstructions(''); setInstructionsError(undefined); setShowInstructions(false); setQuestionTab(''); setQuestionSearch('');
    removedRef.current.clear();
    hasExtractedRef.current = false;
    replaceOnNextResultRef.current = false;
    setRestored({ categories: new Map<string, string>(), fromDocument: new Set<string>() });
    setForm(current => ({
      ...current,
      solicitation: current.rfp.type === 'QUESTIONNAIRE'
        ? { ...current.solicitation, contractTerm: '', incumbentVendor: '', preBidMeeting: '' }
        : current.solicitation,
      rfp: {
        ...current.rfp, type, questionnaireTypeId: type === 'QUESTIONNAIRE' ? 1 : null, source: null, extraction: null, questions: [], sections: [],
        ...(current.rfp.type === 'GENERIC' ? { submissionFormat: 'TECHNICAL_COST' as const, evaluation: '' } : {}),
      },
    }));
  }
  async function selectFile(file: File | undefined) {
    if (!file || disabled || uploadPending.current || !rfp.type) return;
    const aiUpload = rfp.type === 'QUESTIONNAIRE' && extractionEnabled;
    if (!(aiUpload ? /\.(pdf|docx?|txt|xlsx|csv)$/i : /\.(pdf|docx?|txt)$/i).test(file.name) || file.size === 0 || file.size > 25 * 1024 * 1024) { setError(aiUpload ? 'Choose a non-empty PDF, Word, Excel (.xlsx), CSV or text document up to 25 MB.' : 'Choose a non-empty PDF, Word or text document up to 25 MB.'); return; }
    if (rfp.type === 'QUESTIONNAIRE' && extractionEnabled) {
      const replacing = hasExtractedRef.current || rfp.questions.some(fromDocument);
      if (replacing && rfp.questions.length && !window.confirm('Replace the source document? All current questions, including manually added questions, will be removed.')) return;
      setError(undefined); setSelectedFile(file);
      update({ questions: replacing ? [] : rfp.questions.filter(q => q.text.trim()) });
      // Upload only; the user extracts once their instructions are ready.
      await uploadDocument(file);
      return;
    }
    setError(undefined); setSelectedFile(file); setUploading(true);
    uploadPending.current = true; onUploadingChange?.(true);
    try {
      const source = await service.upload({ opportunityId: saved?.id ?? '', expectedRevision: saved?.revision ?? 0, idempotencyKey: randomUUID() }, file);
      if (mounted.current) setForm(current => ({ ...current, rfp: { ...current.rfp, source, extraction: null } }));
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Document upload failed. Please try again.');
    } finally {
      uploadPending.current = false;
      if (mounted.current) { setUploading(false); setSelectedFile(undefined); onUploadingChange?.(false); }
    }
  }
  // Category tabs only for the extraction flow; other views keep the plain list.
  const tabbed = rfp.type === 'QUESTIONNAIRE' && extractionEnabled;
  const counts = new Map<string, number>();
  rfp.questions.forEach(question => counts.set(categoryOf(question), (counts.get(categoryOf(question)) ?? 0) + 1));
  // Fixed categories keep their defined tab order; any other category actually present (e.g. a
  // verbatim section name from "Client-Predefined Questionnaire") is appended in document order.
  const categories = [...QUESTION_CATEGORIES.filter(category => counts.has(category)), ...[...counts.keys()].filter(category => !QUESTION_CATEGORIES.includes(category))];
  // The total is shown in the heading, so there is no All tab; an emptied tab falls back to the first section.
  const activeTab = counts.has(questionTab) ? questionTab : categories[0] ?? '';
  const searching = questionSearch.trim().length > 0;
  // Many categories no longer wrap the tab row onto several lines; it scrolls horizontally
  // instead, with arrow buttons that appear only once there's actually something to scroll to.
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ left: false, right: false });
  useEffect(() => {
    const el = tabScrollRef.current;
    if (!el) { setTabScroll({ left: false, right: false }); return; }
    const update = () => setTabScroll({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    // Not available in every test environment; the initial check and scroll listener above still work without it.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(el);
    return () => { el.removeEventListener('scroll', update); observer?.disconnect(); };
  }, [categories.join('|'), tabbed, searching]);
  const scrollTabs = (direction: 1 | -1) => tabScrollRef.current?.scrollBy({ left: direction * 160, behavior: 'smooth' });
  const matchesSearch = (question: PreparedQuestion) => question.text.toLowerCase().includes(questionSearch.trim().toLowerCase());
  // Searching looks across every category at once; otherwise just the active tab (or, when
  // there are no tabs, every question).
  const visible = (searching ? rfp.questions.filter(matchesSearch) : tabbed ? rfp.questions.filter(question => categoryOf(question) === activeTab) : rfp.questions)
    .sort((a, b) => (a.sourceOrder ?? Infinity) - (b.sourceOrder ?? Infinity));
  // Search results mix categories, so each row names the section it belongs to.
  const questionRow = (question: PreparedQuestion, index: number, showCategory = false) => <div key={question.id} className="flex min-w-0 items-start gap-2">
    <span className="w-6 shrink-0 pt-2 text-sm text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
    <Label htmlFor={`question-${question.id}`} className="sr-only">{`Question ${index + 1} text`}</Label>
    {showCategory && <span className="w-28 shrink-0 pt-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">{categoryOf(question)}</span>}
    <div className="opp-question-input">
      <Textarea id={`question-${question.id}`} ref={element => {
        if (!element) return;
        if (focusQuestionId.current === question.id) { focusQuestionId.current = undefined; element.focus(); }
        // Grows with content instead of a fixed box: measured fresh each render (new ref callback
        // identity below runs on every re-render, not just mount), starting from "auto" so a
        // shortened question shrinks back down instead of staying at its old, taller height.
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
      }} rows={1} className={`min-h-[36px] max-h-60 min-w-0 resize-none overflow-y-auto text-sm${tabbed && !fromDocument(question) ? ' opp-question-with-section' : ''}`} placeholder="Enter question" value={question.text} disabled={locked} onChange={event => update({ questions: rfp.questions.map(q => q.id === question.id ? { ...q, text: event.target.value, validated: false } : q) })} />
      {/* Manually added questions choose their section inside the box; the tab follows the question. */}
      {tabbed && !fromDocument(question) && <Select value={chosenCategory(question) ?? ''} disabled={locked} onValueChange={category => { update({ questions: rfp.questions.map(q => q.id === question.id ? { ...q, category } : q) }); setQuestionTab(category); }}>
        <SelectTrigger className="opp-question-section" aria-label={`Question ${index + 1} section`}><SelectValue placeholder="Select Question Category" /></SelectTrigger>
        <SelectContent>{[...new Set([...categories, ...(chosenCategory(question) ? [categoryOf(question)] : [])])].map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
      </Select>}
    </div>
    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove question ${index + 1}`} title={`Remove question ${index + 1}`} disabled={locked} onClick={() => {
      if (!window.confirm('Remove this question? Its response and approval will be invalidated when the opportunity is saved.')) return;
      if (extractedQuestion(question)) extractionCandidateKeys(question).forEach(key => removedRef.current.add(key));
      update({ questions: rfp.questions.filter(q => q.id !== question.id) });
    }}><Trash2 className="size-4" /></Button>
  </div>;
  return <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="RFP type" aria-invalid={Boolean(rfpTypeError)}>{([{ type: 'QUESTIONNAIRE', label: 'Questionnaire-based', hint: 'Fixed set of questions', icon: MessageCircle }, { type: 'GENERIC', label: 'Generic RFP', hint: 'Full written proposal', icon: FileText }] as const).map(choice => <Button key={choice.type} type="button" variant="outline" className={`opp-type ${rfp.type === choice.type ? 'opp-selected' : ''}`} aria-pressed={rfp.type === choice.type} disabled={locked} onClick={() => choose(choice.type)}><span className="opp-type-icon" aria-hidden="true"><choice.icon className="size-4" /></span><span className="min-w-0 flex-1 text-left"><strong className="block">{choice.label}</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">{choice.hint}</span></span><span className="opp-type-indicator" aria-hidden="true">{rfp.type === choice.type && <Check className="size-3" />}</span></Button>)}</div>
    {rfpTypeError && <p role="alert" className="text-xs text-destructive">{rfpTypeError}</p>}
    {!saved && <p className="text-xs text-muted-foreground">Save queues the opportunity for Sales Head approval.</p>}
    <details className="opp-details" open><summary>Solicitation & procurement details</summary><div className="opp-fields opp-procurement-fields p-3">
      <Field label="Solicitation / reference number" value={form.solicitation.reference} onChange={v => solicitation('reference', v)} disabled={locked} required />
      <Field label="Issuing agency / department" value={form.solicitation.issuingAgency} onChange={v => solicitation('issuingAgency', v)} disabled={locked} required />
      <Field label="Procurement contact" value={form.solicitation.procurementContact} onChange={v => solicitation('procurementContact', v)} disabled={locked} />
      <Choice label="Submission method" value={form.solicitation.submissionMethod} options={[{ id: 'PORTAL', label: 'Online portal' }, { id: 'EMAIL', label: 'Email' }, { id: 'PHYSICAL', label: 'Physical submission' }]} onChange={v => solicitation('submissionMethod', v as Solicitation['submissionMethod'])} disabled={locked} required />
      {rfp.type === 'QUESTIONNAIRE' && <>
      <Field label="Contract term" value={form.solicitation.contractTerm} onChange={v => solicitation('contractTerm', v)} disabled={locked} />
      <Field label="Incumbent vendor" value={form.solicitation.incumbentVendor} onChange={v => solicitation('incumbentVendor', v)} disabled={locked} />
      <Choice label="Pre-bid meeting" value={form.solicitation.preBidMeeting} options={[{ id: 'UNCONFIRMED', label: 'To be confirmed' }, { id: 'YES', label: 'Yes' }, { id: 'NO', label: 'No' }]} onChange={v => solicitation('preBidMeeting', v as Solicitation['preBidMeeting'])} disabled={locked} />
      </>}
    </div></details>
    <details className="opp-details" open><summary>Important dates</summary><div className="opp-fields p-3">{(['questionsDue', 'submissionDeadline'] as const).map((key, i) => <Field key={key} label={['Questions due', 'Submission deadline'][i]} value={form.dates[key]} type="date" onChange={v => date(key, v)} disabled={locked} required={key === 'submissionDeadline'} max={key === 'questionsDue' ? shiftDate(form.dates.submissionDeadline, -1) : undefined} min={key === 'submissionDeadline' ? shiftDate(form.dates.questionsDue, 1) : undefined} />)}</div></details>
    {rfp.type && <>
      <div className="opp-upload">
        <Label htmlFor="opportunity-source" className={tabbed ? 'sr-only' : undefined}>{rfp.type === 'GENERIC' ? 'Source document / brief' : 'Source questionnaire'}</Label>
        <div className="opp-upload-controls">
          <div className={cn('opp-file-picker', tabbed && 'opp-file-picker-compact')}>
            <input className="sr-only" id="opportunity-source" type="file" accept={tabbed ? '.pdf,.doc,.docx,.txt,.xlsx,.csv' : '.pdf,.doc,.docx,.txt'} disabled={locked} aria-busy={uploading} aria-describedby="opportunity-source-status" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = ''; }} />
            <label htmlFor="opportunity-source" className={tabbed ? cn('opp-file-choose', buttonVariants({ size: 'sm' }), 'h-7 px-2.5') : 'opp-file-choose'} aria-disabled={locked}>Choose File</label>
            <div className="opp-file-name min-w-0 flex-1 truncate">
              {uploading ? <span role="status" className="truncate">Uploading {selectedFile?.name ?? 'document'}...</span> : rfp.source ? <DocumentDownload document={rfp.source} opportunityId={saved?.id ?? null} disabled={locked} truncate={tabbed} /> : <span>No file chosen</span>}
            </div>
          </div>
          {tabbed && <TooltipProvider delayDuration={200}><div className="opp-mode-options" role="group" aria-label="Extraction mode">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className="opp-mode-option">
                  <Checkbox disabled={locked} checked={!asIs} onCheckedChange={checked => { if (checked === true) update({ questionnaireTypeId: 1 }); }} />
                  <span>Document-Based Questionnaire</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="opp-tooltip max-w-xs text-left">Client sends an RFP document containing questions that need to be extracted.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className="opp-mode-option">
                  <Checkbox disabled={locked} checked={asIs} onCheckedChange={checked => { if (checked === true) update({ questionnaireTypeId: 2 }); }} />
                  <span>Client-Predefined Questionnaire</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="opp-tooltip max-w-xs text-left">Client's fixed set of questions in a specific format.</TooltipContent>
            </Tooltip>
          </div></TooltipProvider>}
          {rfp.type === 'QUESTIONNAIRE' && <Button type="button" size="sm" disabled={locked || !extractionEnabled || !uploaded || extracting} onClick={() => void extractQuestions()}>{extracting ? 'Extracting...' : 'Extract questions'}</Button>}
        </div>
        <div id="opportunity-source-status" className="opp-upload-status">
          <span>PDF, Word or text · Max 25 MB</span>
        </div>
        {rfp.type === 'QUESTIONNAIRE' && extractionEnabled && <div className="opp-upload-extraction mt-3 space-y-2">
          {uploaded && !uploading && <p className="text-xs text-muted-foreground">{asIs ? 'Document uploaded. "Client-Predefined Questionnaire" copies the questions already in this file exactly as they are.' : 'Document uploaded. "Document-Based Questionnaire" extracts them below, or add instructions to focus on specific topics.'}</p>}
          {!asIs && <Button type="button" variant="link" className="h-auto p-0 underline" aria-expanded={showInstructions} aria-controls="extraction-instructions-panel" disabled={locked} onClick={() => setShowInstructions(open => !open)}>
            {showInstructions ? 'Hide extraction instructions' : instructions.trim() ? 'Edit extraction instructions' : '+ Add extraction instructions'}
          </Button>}
          {!asIs && showInstructions && <div id="extraction-instructions-panel" className="space-y-1">
            <Label htmlFor="extraction-instructions" className="sr-only">Extraction instructions</Label>
            <Textarea id="extraction-instructions" ref={instructionsRef} rows={3} maxLength={MAX_INSTRUCTIONS} value={instructions} disabled={locked}
              placeholder="Optional: focus on specific topics, e.g. technical and pricing questions. Leave empty to extract all questions."
              aria-invalid={Boolean(instructionsError)} aria-describedby={instructionsError ? 'extraction-instructions-error' : undefined}
              onChange={event => { setInstructions(event.target.value); if (!event.target.value.trim() || !instructionsTooShort(event.target.value.trim())) setInstructionsError(undefined); }} />
            <span className="block text-right text-xs text-muted-foreground">{instructions.length}/{MAX_INSTRUCTIONS}</span>
          </div>}
          {instructionsError && <p id="extraction-instructions-error" role="alert" className="text-xs text-destructive">{instructionsError}</p>}
          {error && <p id="extraction-error" role="alert" className="text-xs text-destructive">{error}</p>}
          {job && <div role="status" aria-label="Extraction progress" className="mt-2 space-y-1">
            <Progress value={extractionPercent(status)} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{extracting && <Spinner className="size-3 shrink-0" aria-hidden="true" />}<span>{extractionPercent(status) > 0 ? `${extractionPercent(status)}% · ` : ''}{status ? extractionProgress(status, asIs) : 'Reading the document...'}</span></p>
          </div>}
        </div>}
      </div>
      {error && !(rfp.type === 'QUESTIONNAIRE' && extractionEnabled) && <Notice error={error} />}
      {rfp.type === 'GENERIC' && <>
        <h3 className="font-semibold">Proposal structure</h3><Choice label="Submission format" value={rfp.submissionFormat} options={[{ id: 'TECHNICAL_COST', label: 'Technical + Cost volumes' }, { id: 'COMBINED', label: 'Single combined proposal' }]} onChange={v => update({ submissionFormat: v as RfpDraft['submissionFormat'] })} disabled={locked} />
        <fieldset className="opp-proposal-sections" disabled={locked}>
          <legend className="text-sm font-medium">Required proposal sections <span className="text-xs font-normal text-muted-foreground">— these become the outline</span></legend>
          <div className="opp-proposal-options">{sections.map(section => <Label key={String(section.id)} className="opp-proposal-option"><Checkbox disabled={locked} checked={rfp.sections.some(s => s.key === String(section.id))} onCheckedChange={checked => { if (checked !== true && saved?.responses?.some(r => r.id === `section-${String(section.id)}` && r.answer) && !window.confirm('Remove this section? The affected response and approval will be invalidated when you save.')) return; update({ sections: checked === true ? [...rfp.sections, { key: String(section.id), instructions: section.question }] : rfp.sections.filter(s => s.key !== String(section.id)) }); }} /><span>{section.question}</span></Label>)}</div>
          {loading && <p role="status">Loading proposal sections...</p>}
          {sectionsError && <Notice error={sectionsError} />}
        </fieldset>
        <Field label="Evaluation basis / criteria" multiline value={rfp.evaluation} onChange={v => update({ evaluation: v })} disabled={locked} />
      </>}
      <div className="w-full space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Questions · {rfp.questions.length}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {rfp.questions.length > 1 && <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input className="h-8 w-48 pl-8 pr-7 text-xs" aria-label="Search all questions" placeholder="Search all questions..." value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} />
              {searching && <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search" onClick={() => setQuestionSearch('')}><X className="size-3.5" /></button>}
            </div>}
            <Button type="button" variant="link" disabled={locked} onClick={() => { const id = `draft-${randomUUID()}`; const category = tabbed ? activeTab || 'Other' : undefined; focusQuestionId.current = id; if (category) { draftTabs.current.set(id, category); setQuestionTab(category); } update({ questions: [...rfp.questions, { id, text: '', sourceReference: '', validated: false, ...(category ? { category } : {}) }] }); }}>+ Add question</Button>
          </div>
        </div>
        {searching && <p role="status" className="text-xs text-muted-foreground">{visible.length ? `${visible.length} of ${rfp.questions.length} questions match "${questionSearch.trim()}".` : `No questions match "${questionSearch.trim()}".`}</p>}
        {tabbed && !searching && rfp.questions.length > 0 ? <>
          <div className="opp-question-tabs-row">
            {(tabScroll.left || tabScroll.right) && <button type="button" className="opp-tabs-arrow" aria-label="Scroll categories left" disabled={!tabScroll.left} onClick={() => scrollTabs(-1)}><ChevronLeft className="size-4" /></button>}
            <Tabs value={activeTab} onValueChange={setQuestionTab} className="min-w-0 flex-1">
              <TabsList ref={tabScrollRef} className="opp-question-tabs" aria-label="Question categories">
                {categories.map(tab => <TabsTrigger key={tab} value={tab}>{`${tab} (${counts.get(tab)})`}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            {(tabScroll.left || tabScroll.right) && <button type="button" className="opp-tabs-arrow" aria-label="Scroll categories right" disabled={!tabScroll.right} onClick={() => scrollTabs(1)}><ChevronRight className="size-4" /></button>}
          </div>
          <div className="opp-question-panel space-y-2" role="region" aria-label="Extracted questions">{visible.map((question, index) => questionRow(question, index))}</div>
        </> : <div className={tabbed ? 'opp-question-panel space-y-2' : 'space-y-2'} role={tabbed ? 'region' : undefined} aria-label={tabbed ? (searching ? 'Search results' : undefined) : undefined}>{visible.map((question, index) => questionRow(question, index, tabbed && searching))}</div>}
        {!rfp.questions.length && <div className="opp-empty">{rfp.type === 'GENERIC' ? 'Add questions manually to include them in your proposal.' : extractionEnabled ? 'Add questions manually, or upload a document above and extract them.' : 'Add questions manually. AI extraction will be available here once connected.'}</div>}
      </div>
    </>}
  </div>;
}
