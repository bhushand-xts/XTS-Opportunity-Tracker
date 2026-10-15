import { FieldValidationContext } from './FieldValidation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Badge, useSetPageTitle } from '@xts/design-system';
import type { OpportunityClient, OpportunityDetail, OpportunityDraft, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { useResource } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { isPreparing, newDraft, pendingSaveFieldErrors } from '../lib/workflow';
import { randomUUID } from '../lib/uuid';
import { Choice, Field, Loading, Notice, Panel, Status, options } from './ui';
import { ClientPicker } from './ClientPicker';
import { OpportunityOwnerSelect } from './OpportunityOwnerSelect';
import { RfpPreparation } from './RfpPreparation';
import { ResponseWorkspace } from './ResponseWorkspace';

import { LEAD_SOURCES, SERVICE_LINES } from '../lib/opportunityOptions';
const EMPTY_LOOKUPS: OpportunityLookups = { currencies: [], industries: [], accountTypes: [] };
export function OpportunityFormPage() {
  const { id } = useParams(), access = useOpportunityAccess(), service = useOpportunityService(), navigate = useNavigate(), mutation = useSave();
  const [form, setForm] = useState<OpportunityDraft>(() => newDraft(''));
  const [uploading, setUploading] = useState(false);
  const [baseline, setBaseline] = useState(() => JSON.stringify(form)), [saved, setSaved] = useState<OpportunityDetail>(), [client, setClient] = useState<OpportunityClient | null>(null), [validationAttempted, setValidationAttempted] = useState(false), [responseDirty, setResponseDirty] = useState(false), [saveNote, setSaveNote] = useState<string>();
  const fieldErrors = validationAttempted ? pendingSaveFieldErrors(form) : {};
  const formElement = useRef<HTMLDivElement>(null);
  const serviceLineOptions = options([...new Set([...SERVICE_LINES, ...(saved?.form.serviceLine ? [saved.form.serviceLine] : [])])]);
  const persistedId = useRef<string | null>(id ?? null);
  const creationKey = useRef(randomUUID());
  const load = useCallback((signal: AbortSignal) => service.detail(id!, signal), [service, id]);
  const detail = useResource(load, Boolean(id && access.view));
  const loadLookups = useCallback(() => service.lookups(), [service]);
  const lookupResource = useResource(loadLookups, access.view);
  const lookups = lookupResource.data ?? EMPTY_LOOKUPS;
  const applySaved = useCallback((value: OpportunityDetail) => { persistedId.current = value.id; setSaved(value); setForm(value.form); setBaseline(JSON.stringify(value.form)); setClient(value.client); }, []);
  useEffect(() => { if (detail.data) applySaved(detail.data); }, [detail.data, applySaved]);
  const dirty = JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty || uploading);
  const editable = saved ? access.edit && saved.allowedActions.includes('EDIT') && isPreparing(saved) : access.add;
  useSetPageTitle(saved ? 'Opportunity workspace' : 'New opportunity');
  const change = <K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) => setForm(f => ({ ...f, [key]: value }));
  async function save() {
    if (!editable || uploading) return;
    const errors = pendingSaveFieldErrors(form); setValidationAttempted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => { const first = formElement.current?.querySelector<HTMLElement>('[aria-invalid="true"]'); first?.focus(); first?.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      return;
    }
    const identity = persistedId.current;
    await mutation.run(JSON.stringify({ identity, revision: saved?.revision, form }), key => service.save({ id: identity, expectedRevision: saved?.revision ?? null, idempotencyKey: identity ? key : creationKey.current, form }), value => {
      applySaved(value);
      if (responseDirty) { if (!id) navigate(`/opportunity/${value.id}/edit`, { replace: true }); if (responseDirty) setSaveNote('Opportunity saved. Your unsaved answer or assignment is still here; save it before leaving.'); }
      else navigate(`/opportunity?saved=${encodeURIComponent(value.id)}`);
    }, identity ? 'Opportunity updated.' : 'Opportunity saved as Pending and queued for Sales Head.');
  }
  if (id && detail.loading && !saved) return <Loading />;
  if (id && detail.error) return <Notice error={detail.error} retry={detail.reload} />;
  if (!id && !access.add) return <Notice title="Access restricted" error="You do not have permission to create opportunities." />;
  return <FieldValidationContext.Provider value={fieldErrors}><div ref={formElement} className="opp-page opp-form-page">
    <header className="opp-form-heading">
      <h1 className="sr-only">{saved ? 'Opportunity workspace' : 'New opportunity'}</h1>
      <Link to="/opportunity" className="opp-back">← Back to Pipeline</Link>
      {saved ? <Status state={saved.state} /> : <Badge variant="outline">Not saved yet</Badge>}
      <p className="text-muted-foreground">{saved ? `${saved.number} · ${saved.title}` : 'Add opportunity and client details. RFP preparation is optional.'}</p>
    </header>
    {!editable && <p className="opp-notice">Opportunity details are read-only for your permissions or this stage. Your permitted response actions remain available below.</p>}
    {lookupResource.error && <Notice title="Master data unavailable" error={lookupResource.error} retry={lookupResource.reload} />}
    <div className="opp-intake"><div className="space-y-3"><Panel title="Opportunity details" description="The essentials for your sales pipeline" tone="violet"><fieldset disabled={!editable || mutation.saving} className="min-w-0 space-y-3"><div className="opp-fields opp-primary-fields"><div className="opp-field-full"><Field label="Opportunity name / title" value={form.title} onChange={v => change('title', v)} required /></div><Choice searchable label="Currency" value={form.currencyId} options={lookups.currencies} onChange={v => change('currencyId', v)} required /><Field label="Estimated value" type="number" value={form.estimatedValue} onChange={v => change('estimatedValue', v)} required /><Field label="Estimated value (USD)" type="number" value={form.estimatedValueUsd ?? ''} onChange={v => change('estimatedValueUsd', v)} required /><Choice searchable label="Service line" value={form.serviceLine} options={serviceLineOptions} onChange={v => change('serviceLine', v)} required />{form.serviceLine === 'Other' && <Field label="Other service line" value={form.serviceLineOther ?? ''} onChange={v => change('serviceLineOther', v)} required />}<Choice label="Priority" value={form.priority} options={[{ id: 'LOW', label: 'Low' }, { id: 'MEDIUM', label: 'Medium' }, { id: 'HIGH', label: 'High' }]} onChange={v => change('priority', v as OpportunityDraft['priority'])} required /><Choice searchable label="Lead source" value={form.leadSource} options={LEAD_SOURCES} onChange={v => change('leadSource', v)} /><OpportunityOwnerSelect value={form.ownerId} selected={saved?.owner} onChange={v => change('ownerId', v)} disabled={!editable || mutation.saving} /><div className="opp-field-full"><Field label="Description" multiline value={form.description} onChange={v => change('description', v)} /></div></div></fieldset></Panel><Panel title="Client & primary contact" tone="teal"><ClientPicker selected={client} lookups={lookups} disabled={!editable || mutation.saving} canCreate={access.clientCreate === true || saved?.allowedActions.includes('CLIENT_CREATE') === true} onSelect={selected => { setClient(selected); change('clientId', selected?.id ?? null); }} /></Panel></div>
      <Panel title="Build your RFP response" description="Choose a format to open its workspace" tone="indigo"><RfpPreparation form={form} setForm={setForm} saved={saved} disabled={!editable || mutation.saving} onUploadingChange={setUploading} /></Panel>
    </div>
    {saved?.visibleModules.includes('responses') && <section className="mt-6"><h3 className="mb-2 text-lg font-semibold">Question & answer progress</h3><p className="mb-4 text-sm text-muted-foreground">Opportunity form saves and answer submissions are separate. Unsaved answers are preserved while other form sections are saved.</p><ResponseWorkspace opportunity={saved} onSaved={value => { setSaved(value); /* Do not replace the independent unsaved form draft. */ }} formDirty={dirty} onDirtyChange={setResponseDirty} /></section>}
    {saveNote && responseDirty && <p role="status" className="opp-notice mt-4">{saveNote}</p>}
    <div className="opp-savebar"><p role="status" className="opp-save-status text-sm text-muted-foreground">{uploading ? 'Uploading document...' : mutation.saving ? (saved || id ? 'Updating opportunity…' : 'Saving opportunity…') : dirty ? 'Unsaved changes' : saved ? 'All form changes saved' : 'Save to add this opportunity to Pending.'}</p>{mutation.error && <Notice error={mutation.error} />}<div className="opp-save-actions"><Button type="button" disabled={!editable || mutation.saving || uploading} onClick={async () => void save()}>{mutation.saving ? (saved || id ? 'Updating…' : 'Saving…') : saved || id ? 'Update Opportunity' : 'Save Opportunity'}</Button><Button type="button" variant="ghost" disabled={mutation.saving || uploading} onClick={async () => { if (await confirm()) navigate('/opportunity'); }}>Cancel</Button></div></div>
  </div></FieldValidationContext.Provider>;
}
