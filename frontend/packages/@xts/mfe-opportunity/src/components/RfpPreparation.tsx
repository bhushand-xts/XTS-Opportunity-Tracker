import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Input, Label } from '@xts/design-system';
import type { OpportunityDetail, OpportunityDraft, RfpDraft, Solicitation, ImportantDates } from '@xts/api-contracts';
import { SECTION_CATALOG } from '../lib/workflow';
import { Choice, Field, Notice } from './ui';

export function RfpPreparation({ form, setForm, saved, disabled }: { form: OpportunityDraft; setForm: (form: OpportunityDraft) => void; saved?: OpportunityDetail; disabled: boolean }) {
  const [error, setError] = useState<string>(), [selectedFile, setSelectedFile] = useState<File>();
  const rfp = form.rfp;
  const update = (patch: Partial<RfpDraft>) => setForm({ ...form, rfp: { ...rfp, ...patch } });
  function solicitation<K extends keyof Solicitation>(key: K, value: Solicitation[K]) { setForm({ ...form, solicitation: { ...form.solicitation, [key]: value } }); }
  function date<K extends keyof ImportantDates>(key: K, value: ImportantDates[K]) { setForm({ ...form, dates: { ...form.dates, [key]: value } }); }
  function choose(type: RfpDraft['type']) {
    if (type === rfp.type) return;
    const hasWork = selectedFile || rfp.source || rfp.questions.length || rfp.sections.length || saved?.responses?.some(r => r.answer.trim());
    if (hasWork && !window.confirm('Switch RFP type? Incompatible questions, sections, draft responses and affected approvals will be removed when you save. Shared details and dates will be retained.')) return;
    setSelectedFile(undefined); setError(undefined);
    update({ type, questions: [], sections: [], source: null, extraction: null });
  }
  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx?|txt)$/i.test(file.name) || file.size === 0 || file.size > 25 * 1024 * 1024) { setError('Choose a non-empty PDF, Word or text document up to 25 MB.'); return; }
    setError(undefined); setSelectedFile(file);
  }
  return <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="RFP type">{([{ type: 'QUESTIONNAIRE', label: 'RFP Questionnaire', hint: 'Extract and review questions from a document' }, { type: 'GENERIC', label: 'Generic RFP', hint: 'Build a response from proposal sections' }] as const).map(choice => <Button key={choice.type} type="button" variant="outline" className={`opp-type ${rfp.type === choice.type ? 'opp-selected' : ''}`} aria-pressed={rfp.type === choice.type} disabled={disabled} onClick={() => choose(choice.type)}><span className="text-left"><strong className="block">{choice.label}</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">{choice.hint}</span></span></Button>)}</div>
    <p className="text-xs text-muted-foreground">Save queues the opportunity for Sales Head approval. RFP preparation is optional.</p>
    <details className="opp-details" open><summary>Solicitation & procurement details</summary><div className="opp-fields opp-procurement-fields p-3">
      <Field label="Solicitation / reference number" value={form.solicitation.reference} onChange={v => solicitation('reference', v)} disabled={disabled} required />
      <Field label="Issuing agency / department" value={form.solicitation.issuingAgency} onChange={v => solicitation('issuingAgency', v)} disabled={disabled} required />
      <Field label="Procurement contact" value={form.solicitation.procurementContact} onChange={v => solicitation('procurementContact', v)} disabled={disabled} />
      <Choice label="Submission method" value={form.solicitation.submissionMethod} options={[{ id: 'PORTAL', label: 'Online portal' }, { id: 'EMAIL', label: 'Email' }, { id: 'PHYSICAL', label: 'Physical submission' }]} onChange={v => solicitation('submissionMethod', v as Solicitation['submissionMethod'])} disabled={disabled} required />
      {form.solicitation.submissionMethod === 'EMAIL' && <div className="opp-field-full"><Field label="Submission email" type="email" value={form.solicitation.submissionEmail} onChange={v => solicitation('submissionEmail', v)} disabled={disabled} /></div>}
      {form.solicitation.submissionMethod === 'PHYSICAL' && <div className="opp-field-full"><Field label="Delivery address / instructions" multiline value={form.solicitation.deliveryInstructions} onChange={v => solicitation('deliveryInstructions', v)} disabled={disabled} /></div>}
      <Field label="Contract term" value={form.solicitation.contractTerm} onChange={v => solicitation('contractTerm', v)} disabled={disabled} />
      <Field label="Incumbent vendor" value={form.solicitation.incumbentVendor} onChange={v => solicitation('incumbentVendor', v)} disabled={disabled} />
      <Choice label="Pre-bid meeting" value={form.solicitation.preBidMeeting} options={[{ id: 'UNCONFIRMED', label: 'To be confirmed' }, { id: 'YES', label: 'Yes' }, { id: 'NO', label: 'No' }]} onChange={v => solicitation('preBidMeeting', v as Solicitation['preBidMeeting'])} disabled={disabled} />
    </div></details>
    <details className="opp-details" open><summary>Important dates</summary><div className="opp-fields p-3">{(['questionsDue', 'submissionDeadline'] as const).map((key, i) => <Field key={key} label={['Questions due', 'Submission deadline'][i]} value={form.dates[key]} type="date" onChange={v => date(key, v)} disabled={disabled} required={key === 'submissionDeadline'} />)}</div></details>
    {rfp.type && <>
      <div className="opp-upload">
        <Label htmlFor="opportunity-source">{rfp.type === 'GENERIC' ? 'Source document / brief' : 'Source questionnaire'}</Label>
        <p className="my-2 text-sm break-words">{selectedFile ? `${selectedFile.name} (selected)` : rfp.source?.name || 'Choose a PDF, Word or text document'}</p>
        <Input id="opportunity-source" type="file" accept=".pdf,.doc,.docx,.txt" disabled={disabled} onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
        <p className="mt-2 text-xs text-muted-foreground">PDF, Word or text, up to 25 MB. {rfp.type === 'GENERIC' ? 'Document upload is under development; selected files are not uploaded yet.' : 'Document upload and AI extraction are under development; selected files are not uploaded yet.'}</p>
      </div>
      {rfp.type === 'QUESTIONNAIRE' && <Button type="button" disabled={disabled} onClick={() => toast.info('AI question extraction is currently under development.')}>Extract questions</Button>}
      {error && <Notice error={error} />}
      {rfp.type === 'GENERIC' && <>
        <h3 className="font-semibold">Proposal structure</h3><Choice label="Submission format" value={rfp.submissionFormat} options={[{ id: 'TECHNICAL_COST', label: 'Technical + Cost volumes' }, { id: 'COMBINED', label: 'Single combined proposal' }]} onChange={v => update({ submissionFormat: v as RfpDraft['submissionFormat'] })} disabled={disabled} /><div className="opp-fields"><Choice label="Output file format" value={rfp.outputFormat} options={[{ id: 'PDF', label: 'PDF' }, { id: 'DOCX', label: 'Word document' }, { id: 'PPTX', label: 'Presentation' }]} onChange={v => update({ outputFormat: v as RfpDraft['outputFormat'] })} disabled={disabled} /><Field label="Page limit / volume rules" value={rfp.pageRules} onChange={v => update({ pageRules: v })} disabled={disabled} hint="Text rules, for example Technical: 40 pages; cost: 10 pages." /></div>
        <fieldset className="opp-proposal-sections" disabled={disabled}>
          <legend className="text-sm font-medium">Required proposal sections <span className="text-xs font-normal text-muted-foreground">— these become the outline</span></legend>
          <div className="opp-proposal-options">{SECTION_CATALOG.map(section => <Label key={section.key} className="opp-proposal-option"><Checkbox disabled={disabled} checked={rfp.sections.some(s => s.key === section.key)} onCheckedChange={checked => { if (checked !== true && saved?.responses?.some(r => r.id === `section-${section.key}` && r.answer) && !window.confirm('Remove this section? The affected response and approval will be invalidated when you save.')) return; update({ sections: checked === true ? [...rfp.sections, { key: section.key, instructions: '' }] : rfp.sections.filter(s => s.key !== section.key) }); }} /><span>{section.title}</span></Label>)}</div>
        </fieldset>
        <h3 className="font-semibold">Selected sections · {rfp.sections.length}</h3>{rfp.sections.map(section => <details key={section.key} className="opp-details"><summary>{SECTION_CATALOG.find(s => s.key === section.key)?.title ?? section.key}</summary><div className="p-4"><Field label="Section instructions" value={section.instructions} onChange={v => update({ sections: rfp.sections.map(s => s.key === section.key ? { ...s, instructions: v } : s) })} multiline disabled={disabled} /></div></details>)}{!rfp.sections.length && <div className="opp-empty">Select sections to build your proposal outline.</div>}<Field label="Evaluation basis / criteria" multiline value={rfp.evaluation} onChange={v => update({ evaluation: v })} disabled={disabled} />
      </>}
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Questions · {rfp.questions.length}</h3><div className="flex flex-wrap gap-2"><Button type="button" variant="link" disabled={disabled} onClick={() => update({ questions: [...rfp.questions, { id: `draft-${crypto.randomUUID()}`, text: '', sourceReference: '', validated: false }] })}>+ Add question</Button></div></div>
        {rfp.questions.map((question, index) => <details key={question.id} className="opp-details" open><summary>{String(index + 1).padStart(2, '0')} · {question.text || 'New question'}</summary><div className="space-y-3 p-4"><Field label={`Question ${index + 1} text`} value={question.text} onChange={v => update({ questions: rfp.questions.map(q => q.id === question.id ? { ...q, text: v, validated: false } : q) })} multiline disabled={disabled} /><div className="flex justify-end"><Button type="button" variant="ghost" disabled={disabled} onClick={() => { if (window.confirm('Remove this question? Its response and approval will be invalidated when the opportunity is saved.')) update({ questions: rfp.questions.filter(q => q.id !== question.id) }); }}>Remove question {index + 1}</Button></div></div></details>)}{!rfp.questions.length && <div className="opp-empty">{rfp.type === 'GENERIC' ? 'Add questions manually to include them in your proposal.' : 'Add questions manually. AI extraction will be available here once connected.'}</div>}
    </>}
  </div>;
}
