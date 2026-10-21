import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, FileText, MessageCircle, Trash2 } from 'lucide-react';
import { Button, Checkbox, Label, Progress, Spinner, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, Textarea } from '@xts/design-system';
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
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const rfpTypeError = useFieldError('RFP type');
  // Always read the latest form/disabled from async extraction callbacks, never a stale closure.
  const formRef = useRef(form); formRef.current = form;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController>();
  const removedRef = useRef(new Set<string>());
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
  const categoryOf = (question: PreparedQuestion) => {
    const category = chosenCategory(question) ?? draftTabs.current.get(question.id);
    return category && QUESTION_CATEGORIES.includes(category) ? category : 'Other';
  };
  // Questions that came from the document, including saved ones recovered on reopening; these are
  // what a re-extraction or a replaced file replaces.
  const fromDocument = (question: PreparedQuestion) => extractedQuestion(question) || restored.fromDocument.has(question.id);
  useEffect(() => {
    if (!status || disabledRef.current) return;
    const incoming = status.questions.filter(q => !removedRef.current.has(q.id) && !removedRef.current.has(extractionCandidateKeys(q)[1]));
    const current = formRef.current;
    const questions = mergeExtractedQuestions(current.rfp.questions, incoming);
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
    if (instructions.trim() && instructionsTooShort(instructions.trim())) {
      setShowInstructions(true);
      setInstructionsError("Describe what to extract in a few words, e.g. 'pricing and technical questions', or clear the box to extract all questions.");
      setTimeout(() => instructionsRef.current?.focus());
      return;
    }
    setInstructionsError(undefined);
    if (rfp.questions.some(fromDocument) && !window.confirm('Extract again? Previously extracted questions will be replaced; manually added questions are kept.')) return;
    update({ questions: rfp.questions.filter(q => !fromDocument(q) && q.text.trim()) });
    const { controller, generation } = restart();
    try {
      const accepted = await questionExtractionService.retry(uploaded.id, randomUUID(), controller.signal, instructions);
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
    setInstructions(''); setInstructionsError(undefined); setShowInstructions(false); setQuestionTab('');
    removedRef.current.clear();
    setRestored({ categories: new Map<string, string>(), fromDocument: new Set<string>() });
    setForm(current => ({
      ...current,
      solicitation: current.rfp.type === 'QUESTIONNAIRE'
        ? { ...current.solicitation, contractTerm: '', incumbentVendor: '', preBidMeeting: '' }
        : current.solicitation,
      rfp: {
        ...current.rfp, type, source: null, extraction: null, questions: [], sections: [],
        ...(current.rfp.type === 'GENERIC' ? { submissionFormat: 'TECHNICAL_COST' as const, evaluation: '' } : {}),
      },
    }));
  }
  async function selectFile(file: File | undefined) {
    if (!file || disabled || uploadPending.current || !rfp.type) return;
    const aiUpload = rfp.type === 'QUESTIONNAIRE' && extractionEnabled;
    if (!(aiUpload ? /\.(pdf|docx?|txt|xlsx|csv)$/i : /\.(pdf|docx?|txt)$/i).test(file.name) || file.size === 0 || file.size > 25 * 1024 * 1024) { setError(aiUpload ? 'Choose a non-empty PDF, Word, Excel (.xlsx), CSV or text document up to 25 MB.' : 'Choose a non-empty PDF, Word or text document up to 25 MB.'); return; }
    if (rfp.type === 'QUESTIONNAIRE' && extractionEnabled) {
      if (rfp.questions.some(fromDocument) && !window.confirm('Replace the source document? Previously extracted questions will be removed; manually added questions are kept.')) return;
      setError(undefined); setSelectedFile(file);
      update({ questions: rfp.questions.filter(q => !fromDocument(q) && q.text.trim()) });
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
  const categories = QUESTION_CATEGORIES.filter(category => counts.has(category));
  // The total is shown in the heading, so there is no All tab; an emptied tab falls back to the first section.
  const activeTab = counts.has(questionTab) ? questionTab : categories[0] ?? '';
  const visible = rfp.questions.filter(question => categoryOf(question) === activeTab)
    .sort((a, b) => (a.sourceOrder ?? Infinity) - (b.sourceOrder ?? Infinity));
  const questionRow = (question: PreparedQuestion, index: number) => <div key={question.id} className="flex min-w-0 items-start gap-2">
    <span className="w-6 shrink-0 pt-2 text-sm text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
    <Label htmlFor={`question-${question.id}`} className="sr-only">{`Question ${index + 1} text`}</Label>
    <div className="opp-question-input">
      <Textarea id={`question-${question.id}`} ref={element => { if (element && focusQuestionId.current === question.id) { focusQuestionId.current = undefined; element.focus(); } }} rows={2} className={`min-h-[44px] min-w-0 resize-y text-sm${tabbed && !fromDocument(question) ? ' opp-question-with-section' : ''}`} placeholder="Enter question" value={question.text} disabled={locked} onChange={event => update({ questions: rfp.questions.map(q => q.id === question.id ? { ...q, text: event.target.value, validated: false } : q) })} />
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
    <p className="text-xs text-muted-foreground">Save queues the opportunity for Sales Head approval.</p>
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
    <details className="opp-details" open><summary>Important dates</summary><div className="opp-fields p-3">{(['questionsDue', 'submissionDeadline'] as const).map((key, i) => <Field key={key} label={['Questions due', 'Submission deadline'][i]} value={form.dates[key]} type="date" onChange={v => date(key, v)} disabled={locked} required={key === 'submissionDeadline'} />)}</div></details>
    {rfp.type && <>
      <div className="opp-upload">
        <Label htmlFor="opportunity-source">{rfp.type === 'GENERIC' ? 'Source document / brief' : 'Source questionnaire'}</Label>
        <div className="opp-upload-controls">
          <div className="opp-file-picker">
            <input className="sr-only" id="opportunity-source" type="file" accept={rfp.type === 'QUESTIONNAIRE' && extractionEnabled ? '.pdf,.doc,.docx,.txt,.xlsx,.csv' : '.pdf,.doc,.docx,.txt'} disabled={locked} aria-busy={uploading} aria-describedby="opportunity-source-status" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = ''; }} />
            <label htmlFor="opportunity-source" className="opp-file-choose" aria-disabled={locked}>Choose File</label>
            <div className="opp-file-name">
              {uploading ? <span role="status">Uploading {selectedFile?.name ?? 'document'}...</span> : rfp.source ? <DocumentDownload document={rfp.source} opportunityId={saved?.id ?? null} disabled={locked} /> : <span>No file chosen</span>}
            </div>
          </div>
          {rfp.type === 'QUESTIONNAIRE' && <Button type="button" disabled={locked || !extractionEnabled || !uploaded || extracting} onClick={() => void extractQuestions()}>{extracting ? 'Extracting...' : 'Extract questions'}</Button>}
        </div>
        <div id="opportunity-source-status" className="opp-upload-status">
          <span>PDF, Word or text · Max 25 MB</span>
        </div>
        {rfp.type === 'QUESTIONNAIRE' && extractionEnabled && <div className="opp-upload-extraction mt-3 space-y-2">
          {uploaded && !uploading && <p className="text-xs text-muted-foreground">Document uploaded. Extract the questions, or add instructions to focus on specific topics.</p>}
          <Button type="button" variant="link" className="h-auto p-0 underline" aria-expanded={showInstructions} aria-controls="extraction-instructions-panel" disabled={locked} onClick={() => setShowInstructions(open => !open)}>
            {showInstructions ? 'Hide extraction instructions' : instructions.trim() ? 'Edit extraction instructions' : '+ Add extraction instructions'}
          </Button>
          {showInstructions && <div id="extraction-instructions-panel" className="space-y-1">
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
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{extracting && <Spinner className="size-3 shrink-0" aria-hidden="true" />}<span>{extractionPercent(status) > 0 ? `${extractionPercent(status)}% · ` : ''}{status ? extractionProgress(status) : 'Reading the document...'}</span></p>
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
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Questions · {rfp.questions.length}</h3><div className="flex flex-wrap gap-2"><Button type="button" variant="link" disabled={locked} onClick={() => { const id = `draft-${randomUUID()}`; const category = tabbed ? activeTab || 'Other' : undefined; focusQuestionId.current = id; if (category) { draftTabs.current.set(id, category); setQuestionTab(category); } update({ questions: [...rfp.questions, { id, text: '', sourceReference: '', validated: false, ...(category ? { category } : {}) }] }); }}>+ Add question</Button></div></div>
        {tabbed && rfp.questions.length > 0 ? <>
          <Tabs value={activeTab} onValueChange={setQuestionTab}>
            <TabsList className="opp-question-tabs" aria-label="Question categories">
              {categories.map(tab => <TabsTrigger key={tab} value={tab}>{`${tab} (${counts.get(tab)})`}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="opp-question-panel space-y-2" role="region" aria-label="Extracted questions">{visible.map(questionRow)}</div>
        </> : rfp.questions.map(questionRow)}
        {!rfp.questions.length && <div className="opp-empty">{rfp.type === 'GENERIC' ? 'Add questions manually to include them in your proposal.' : extractionEnabled ? 'Add questions manually, or upload a document above and extract them.' : 'Add questions manually. AI extraction will be available here once connected.'}</div>}
      </div>
    </>}
  </div>;
}
