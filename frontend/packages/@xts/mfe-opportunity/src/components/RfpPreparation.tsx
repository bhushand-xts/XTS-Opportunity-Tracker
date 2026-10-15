import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Checkbox, Input, Label, Progress, Tabs, TabsList, TabsTrigger, Textarea } from '@xts/design-system';
import type { OpportunityDetail, OpportunityDraft, PreparedQuestion, QuestionExtractionStatus, RfpDraft, Solicitation, ImportantDates, SourceDocument } from '@xts/api-contracts';
import { gql, useQuery } from '@apollo/client';
import { useFieldError } from './FieldValidation';
import { extractionCandidateKeys, extractionEnabled, extractionError, extractionProgress, instructionsTooShort, mergeExtractedQuestions, pollDelay, questionExtractionService, ExtractionRequestError, MAX_INSTRUCTIONS } from '../services/QuestionExtractionService';

export const GET_PROPOSAL_SECTIONS = gql`query OpportunityProposalSections { rfpQuestionsList { id question description displayOrder isActive } }`;
import { Choice, Field, Notice } from './ui';

const extractedQuestion = (question: PreparedQuestion) => question.id.startsWith('extracted-');
// Same fixed list the backend asks the AI to choose from, in tab order.
const QUESTION_CATEGORIES = ['Company & Qualifications', 'Team', 'Approach & Delivery', 'Technical', 'Security & Compliance', 'Pricing & Commercial', 'References', 'Other'];
const ALL = 'All';
const categoryOf = (question: PreparedQuestion) => question.category && QUESTION_CATEGORIES.includes(question.category) ? question.category : 'Other';
function extractionState(state: QuestionExtractionStatus['state']): NonNullable<RfpDraft['extraction']>['state'] {
  if (state === 'SUCCEEDED') return 'SUCCEEDED';
  if (state === 'QUEUED' || state === 'PROCESSING') return 'PROCESSING';
  return 'FAILED';
}
function extractionPercent(status: QuestionExtractionStatus | undefined): number {
  if (!status) return 0;
  return Math.min(100, Math.round((status.completed / Math.max(status.total, 1)) * 100));
}

export function RfpPreparation({ form, setForm, saved, disabled }: { form: OpportunityDraft; setForm: (form: OpportunityDraft) => void; saved?: OpportunityDetail; disabled: boolean }) {
  const [error, setError] = useState<string>(), [selectedFile, setSelectedFile] = useState<File>();
  const [job, setJob] = useState<{ id: string; documentId: string }>();
  const [status, setStatus] = useState<QuestionExtractionStatus>();
  // The document uploaded in this session; extraction needs its server id.
  const [uploaded, setUploaded] = useState<SourceDocument>();
  const [uploading, setUploading] = useState(false);
  const [instructions, setInstructions] = useState(''), [instructionsError, setInstructionsError] = useState<string>();
  const [questionTab, setQuestionTab] = useState(ALL), [showInstructions, setShowInstructions] = useState(false);
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
      await pollDelay(1500, signal);
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
    try {
      const { document } = await questionExtractionService.upload(file, saved?.id, controller.signal);
      if (generationRef.current !== generation) return;
      setUploaded(document);
      const current = formRef.current;
      setForm({ ...current, rfp: { ...current.rfp, source: document, extraction: null } });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failureMessage(failure));
    } finally {
      if (generationRef.current === generation) setUploading(false);
    }
  }
  async function extractQuestions() {
    if (!uploaded) return;
    // Instructions are optional: empty extracts every question. Typed text must still mean something.
    if (instructions.trim() && instructionsTooShort(instructions.trim())) {
      setShowInstructions(true);
      setInstructionsError("Describe what to extract in a few words, e.g. 'pricing and technical questions', or clear the box to extract all questions.");
      setTimeout(() => instructionsRef.current?.focus());
      return;
    }
    setInstructionsError(undefined);
    if (rfp.questions.some(extractedQuestion) && !window.confirm('Extract again? Previously extracted questions will be replaced; manually added questions are kept.')) return;
    update({ questions: rfp.questions.filter(q => !extractedQuestion(q)) });
    const { controller, generation } = restart();
    try {
      const accepted = await questionExtractionService.retry(uploaded.id, crypto.randomUUID(), controller.signal, instructions);
      if (generationRef.current !== generation) return;
      runningRef.current = { id: accepted.jobId, documentId: accepted.document.id };
      setJob({ id: accepted.jobId, documentId: accepted.document.id });
      const current = formRef.current;
      setForm({ ...current, rfp: { ...current.rfp, extraction: { id: accepted.jobId, state: 'PROCESSING', error: null } } });
      await poll(accepted.jobId, generation, controller.signal);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failureMessage(failure));
    }
  }
  const { data, loading, error: sectionsError } = useQuery<{ rfpQuestionsList: ({ id: number; question: string; displayOrder: number | null; isActive: boolean } | null)[] }>(GET_PROPOSAL_SECTIONS, { skip: form.rfp.type !== 'GENERIC' });
  const sections = (data?.rfpQuestionsList ?? []).filter((s): s is NonNullable<typeof s> => s !== null && s.isActive).sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.id - b.id);
  const rfp = form.rfp;
  const update = (patch: Partial<RfpDraft>) => setForm({ ...form, rfp: { ...rfp, ...patch } });
  function solicitation<K extends keyof Solicitation>(key: K, value: Solicitation[K]) { setForm({ ...form, solicitation: { ...form.solicitation, [key]: value } }); }
  function date<K extends keyof ImportantDates>(key: K, value: ImportantDates[K]) { setForm({ ...form, dates: { ...form.dates, [key]: value } }); }
  function choose(type: RfpDraft['type']) {
    if (type === rfp.type) return;
    const hasWork = selectedFile || rfp.source || rfp.questions.length || rfp.sections.length || saved?.responses?.some(r => r.answer.trim());
    if (hasWork && !window.confirm('Switch RFP type? Incompatible questions, sections, draft responses and affected approvals will be removed when you save. Shared details and dates will be retained.')) return;
    abortRef.current?.abort(); cancelRunning(); generationRef.current++;
    setSelectedFile(undefined); setJob(undefined); setStatus(undefined); setError(undefined);
    setUploaded(undefined); setUploading(false); setInstructionsError(undefined);
    update({ type, questions: [], sections: [], source: null, extraction: null });
  }
  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx?|txt|xlsx|csv)$/i.test(file.name) || file.size === 0 || file.size > 25 * 1024 * 1024) { setError('Choose a non-empty PDF, Word, Excel (.xlsx), CSV or text document up to 25 MB.'); return; }
    if (rfp.type === 'QUESTIONNAIRE' && extractionEnabled) {
      if (rfp.questions.some(extractedQuestion) && !window.confirm('Replace the source document? Previously extracted questions will be removed; manually added questions are kept.')) return;
      setError(undefined); setSelectedFile(file);
      update({ questions: rfp.questions.filter(q => !extractedQuestion(q)) });
      // Upload only; the user extracts once their instructions are ready.
      void uploadDocument(file);
      return;
    }
    setError(undefined); setSelectedFile(file);
  }
  // Category tabs only for the extraction flow; other views keep the plain list.
  const tabbed = rfp.type === 'QUESTIONNAIRE' && extractionEnabled;
  const counts = new Map<string, number>();
  rfp.questions.forEach(question => counts.set(categoryOf(question), (counts.get(categoryOf(question)) ?? 0) + 1));
  const categories = QUESTION_CATEGORIES.filter(category => counts.has(category));
  // A tab that has become empty (re-extraction, removals) falls back to All.
  const activeTab = questionTab !== ALL && counts.has(questionTab) ? questionTab : ALL;
  const visible = activeTab === ALL ? rfp.questions
    : rfp.questions.filter(question => categoryOf(question) === activeTab)
      .sort((a, b) => (a.sourceOrder ?? Infinity) - (b.sourceOrder ?? Infinity));
  const questionRow = (question: PreparedQuestion, index: number) => <div key={question.id} className="flex min-w-0 items-start gap-2">
    <span className="w-6 shrink-0 pt-2 text-sm text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
    <Label htmlFor={`question-${question.id}`} className="sr-only">{`Question ${index + 1} text`}</Label>
    <Textarea id={`question-${question.id}`} rows={2} className="min-h-[44px] min-w-0 flex-1 resize-y text-sm" placeholder="Enter question" value={question.text} disabled={disabled} onChange={event => update({ questions: rfp.questions.map(q => q.id === question.id ? { ...q, text: event.target.value, validated: false } : q) })} />
    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove question ${index + 1}`} title={`Remove question ${index + 1}`} disabled={disabled} onClick={() => {
      if (!window.confirm('Remove this question? Its response and approval will be invalidated when the opportunity is saved.')) return;
      if (extractedQuestion(question)) extractionCandidateKeys(question).forEach(key => removedRef.current.add(key));
      update({ questions: rfp.questions.filter(q => q.id !== question.id) });
    }}><Trash2 className="size-4" /></Button>
  </div>;
  return <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="RFP type" aria-invalid={Boolean(rfpTypeError)}>{([{ type: 'QUESTIONNAIRE', label: 'RFP Questionnaire', hint: 'Extract and review questions from a document' }, { type: 'GENERIC', label: 'Generic RFP', hint: 'Build a response from proposal sections' }] as const).map(choice => <Button key={choice.type} type="button" variant="outline" className={`opp-type ${rfp.type === choice.type ? 'opp-selected' : ''}`} aria-pressed={rfp.type === choice.type} disabled={disabled} onClick={() => choose(choice.type)}><span className="text-left"><strong className="block">{choice.label}</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">{choice.hint}</span></span></Button>)}</div>
    {rfpTypeError && <p role="alert" className="text-xs text-destructive">{rfpTypeError}</p>}
    <p className="text-xs text-muted-foreground">Save queues the opportunity for Sales Head approval. Select an RFP type to continue.</p>
    <details className="opp-details" open><summary>Solicitation & procurement details</summary><div className="opp-fields opp-procurement-fields p-3">
      <Field label="Solicitation / reference number" value={form.solicitation.reference} onChange={v => solicitation('reference', v)} disabled={disabled} required />
      <Field label="Issuing agency / department" value={form.solicitation.issuingAgency} onChange={v => solicitation('issuingAgency', v)} disabled={disabled} required />
      <Field label="Procurement contact" value={form.solicitation.procurementContact} onChange={v => solicitation('procurementContact', v)} disabled={disabled} />
      <Choice label="Submission method" value={form.solicitation.submissionMethod} options={[{ id: 'PORTAL', label: 'Online portal' }, { id: 'EMAIL', label: 'Email' }, { id: 'PHYSICAL', label: 'Physical submission' }]} onChange={v => solicitation('submissionMethod', v as Solicitation['submissionMethod'])} disabled={disabled} required />
      {rfp.type === 'QUESTIONNAIRE' && <>
      <Field label="Contract term" value={form.solicitation.contractTerm} onChange={v => solicitation('contractTerm', v)} disabled={disabled} />
      <Field label="Incumbent vendor" value={form.solicitation.incumbentVendor} onChange={v => solicitation('incumbentVendor', v)} disabled={disabled} />
      <Choice label="Pre-bid meeting" value={form.solicitation.preBidMeeting} options={[{ id: 'UNCONFIRMED', label: 'To be confirmed' }, { id: 'YES', label: 'Yes' }, { id: 'NO', label: 'No' }]} onChange={v => solicitation('preBidMeeting', v as Solicitation['preBidMeeting'])} disabled={disabled} />
      </>}
    </div></details>
    <details className="opp-details" open><summary>Important dates</summary><div className="opp-fields p-3">{(['questionsDue', 'submissionDeadline'] as const).map((key, i) => <Field key={key} label={['Questions due', 'Submission deadline'][i]} value={form.dates[key]} type="date" onChange={v => date(key, v)} disabled={disabled} required={key === 'submissionDeadline'} />)}</div></details>
    {rfp.type && <>
      <div className="opp-upload">
        <Label htmlFor="opportunity-source">{rfp.type === 'GENERIC' ? 'Source document / brief' : 'Source questionnaire'}</Label>
        <p className={`my-2 text-sm break-words ${selectedFile || rfp.source ? 'opp-upload-file' : ''}`}>{selectedFile ? `${selectedFile.name} (selected)` : rfp.source?.name || 'Choose a PDF, Word, Excel or text document'}</p>
        <Input id="opportunity-source" type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.csv" disabled={disabled} onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
        <p className="mt-2 text-xs text-muted-foreground">PDF, Word, Excel (.xlsx), CSV or text, up to 25 MB. {rfp.type === 'GENERIC' ? 'Document upload is under development; selected files are not uploaded yet.' : !extractionEnabled ? 'Document upload and AI extraction are under development; selected files are not uploaded yet.' : uploading ? 'Uploading the document...' : uploaded ? 'Document uploaded. Extract the questions, or add instructions to focus on specific topics.' : 'Upload a document to extract its questions.'}</p>
        {rfp.type === 'QUESTIONNAIRE' && extractionEnabled && <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="link" className="h-auto p-0 underline" aria-expanded={showInstructions} aria-controls="extraction-instructions-panel" disabled={disabled}
              onClick={() => setShowInstructions(open => !open)}>
              {showInstructions ? 'Hide extraction instructions' : instructions.trim() ? 'Edit extraction instructions' : '+ Add extraction instructions'}
            </Button>
            <Button type="button" disabled={disabled || !uploaded || uploading || extracting} onClick={() => void extractQuestions()}>{extracting ? 'Extracting...' : 'Extract questions'}</Button>
          </div>
          {showInstructions && <div id="extraction-instructions-panel" className="space-y-1">
            <Label htmlFor="extraction-instructions" className="sr-only">Extraction instructions</Label>
            <Textarea id="extraction-instructions" ref={instructionsRef} rows={3} maxLength={MAX_INSTRUCTIONS} className="text-sm placeholder:text-muted-foreground/50" value={instructions} disabled={disabled}
              placeholder="Optional: focus on specific topics, e.g. technical and pricing questions. Leave empty to extract all questions."
              aria-invalid={Boolean(instructionsError)} aria-describedby={instructionsError ? 'extraction-instructions-error' : undefined}
              onChange={event => { setInstructions(event.target.value); if (!event.target.value.trim() || !instructionsTooShort(event.target.value.trim())) setInstructionsError(undefined); }} />
            <span className="block text-right text-xs text-muted-foreground">{instructions.length}/{MAX_INSTRUCTIONS}</span>
          </div>}
          {instructionsError && <p id="extraction-instructions-error" role="alert" className="text-xs text-destructive">{instructionsError}</p>}
        </div>}
        {rfp.type === 'QUESTIONNAIRE' && extractionEnabled && job && <div role="status" aria-label="Extraction progress" className="mt-2 space-y-1">
          <Progress value={extractionPercent(status)} />
          <p className="text-xs text-muted-foreground">{extractionPercent(status)}% — {status ? extractionProgress(status) : 'Reading the document...'}</p>
        </div>}
      </div>
      {error && <Notice error={error} />}
      {rfp.type === 'GENERIC' && <>
        <h3 className="font-semibold">Proposal structure</h3><Choice label="Submission format" value={rfp.submissionFormat} options={[{ id: 'TECHNICAL_COST', label: 'Technical + Cost volumes' }, { id: 'COMBINED', label: 'Single combined proposal' }]} onChange={v => update({ submissionFormat: v as RfpDraft['submissionFormat'] })} disabled={disabled} />
        <fieldset className="opp-proposal-sections" disabled={disabled}>
          <legend className="text-sm font-medium">Required proposal sections <span className="text-xs font-normal text-muted-foreground">— these become the outline</span></legend>
          <div className="opp-proposal-options">{sections.map(section => <Label key={String(section.id)} className="opp-proposal-option"><Checkbox disabled={disabled} checked={rfp.sections.some(s => s.key === String(section.id))} onCheckedChange={checked => { if (checked !== true && saved?.responses?.some(r => r.id === `section-${String(section.id)}` && r.answer) && !window.confirm('Remove this section? The affected response and approval will be invalidated when you save.')) return; update({ sections: checked === true ? [...rfp.sections, { key: String(section.id), instructions: section.question }] : rfp.sections.filter(s => s.key !== String(section.id)) }); }} /><span>{section.question}</span></Label>)}</div>
          {loading && <p role="status">Loading proposal sections...</p>}
          {sectionsError && <Notice error={sectionsError} />}
        </fieldset>
        <Field label="Evaluation basis / criteria" multiline value={rfp.evaluation} onChange={v => update({ evaluation: v })} disabled={disabled} />
      </>}
      <div className="w-full space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Questions · {rfp.questions.length}</h3><div className="flex flex-wrap gap-2"><Button type="button" variant="link" disabled={disabled} onClick={() => update({ questions: [...rfp.questions, { id: `draft-${crypto.randomUUID()}`, text: '', sourceReference: '', validated: false, ...(tabbed && activeTab !== ALL ? { category: activeTab } : {}) }] })}>+ Add question</Button></div></div>
        {tabbed && rfp.questions.length > 0 ? <>
          <Tabs value={activeTab} onValueChange={setQuestionTab}>
            <TabsList className="opp-question-tabs" aria-label="Question categories">
              {[ALL, ...categories].map(tab => <TabsTrigger key={tab} value={tab}>{`${tab} (${tab === ALL ? rfp.questions.length : counts.get(tab)})`}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="opp-question-panel space-y-2" role="region" aria-label="Extracted questions">{visible.map(questionRow)}</div>
        </> : rfp.questions.map(questionRow)}
        {!rfp.questions.length && <div className="opp-empty">{rfp.type === 'GENERIC' ? 'Add questions manually to include them in your proposal.' : extractionEnabled ? 'Add questions manually, or upload a document above and extract them.' : 'Add questions manually. AI extraction will be available here once connected.'}</div>}
      </div>
    </>}
  </div>;
}
