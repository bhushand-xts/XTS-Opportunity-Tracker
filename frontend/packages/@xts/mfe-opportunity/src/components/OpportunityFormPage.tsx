import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Badge, useSetPageTitle } from '@xts/design-system';
import type { OpportunityClient, OpportunityDetail, OpportunityDraft, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { useResource, useDebounce } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { isPreparing, newDraft } from '../lib/workflow';
import { Choice, Field, Loading, Notice, Panel, Status, options } from './ui';
import { FieldValidationContext, focusInvalidField } from './FieldValidation';
import { SERVICE_LINES, LEAD_SOURCES } from '../lib/intakeOptions';
import { normalizedTitle, opportunityFieldErrors, ownerFieldError, type FieldErrors } from '../lib/intakeValidation';
import { checkOpportunitySave, findDuplicateTitle, FIELD_VALIDATION_FAILED } from '../services/intakeChecks';
import { useOwnerDirectory } from '../services/useOwnerDirectory';
import { ClientPicker } from './ClientPicker';
import { OpportunityOwnerSelect } from './OpportunityOwnerSelect';
import { RfpPreparation } from './RfpPreparation';
import { ResponseWorkspace } from './ResponseWorkspace';

const EMPTY_LOOKUPS: OpportunityLookups = { currencies: [], industries: [], accountTypes: [] };
export function OpportunityFormPage() {
  const { id } = useParams(), access = useOpportunityAccess(), service = useOpportunityService(), navigate = useNavigate(), mutation = useSave();
  const [form, setForm] = useState<OpportunityDraft>(() => newDraft(access.userId ?? ''));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form)), [saved, setSaved] = useState<OpportunityDetail>(), [client, setClient] = useState<OpportunityClient | null>(null), [submitted, setSubmitted] = useState(false), [touched, setTouched] = useState<Record<string, boolean>>({}), [responseDirty, setResponseDirty] = useState(false), [saveNote, setSaveNote] = useState<string>();
  const [remoteValidation, setRemoteValidation] = useState<{ form: OpportunityDraft; client: OpportunityClient | null; errors: FieldErrors }>();
  const owners = useOwnerDirectory(access.view);
  const serviceLineOptions = options([...new Set([...SERVICE_LINES, ...(saved?.form.serviceLine ? [saved.form.serviceLine] : [])])]);
  const leadSourceOptions = options([...new Set([...LEAD_SOURCES, ...(saved?.form.leadSource ? [saved.form.leadSource] : [])])]);
  const formRef = useRef<HTMLDivElement>(null);
  const touch = (key: string) => {
    if (!touched[key]) setTouched(previous => previous[key] ? previous : { ...previous, [key]: true });
  };
  const persistedId = useRef<string | null>(id ?? null);
  const creationKey = useRef(crypto.randomUUID());
  const load = useCallback((signal: AbortSignal) => service.detail(id!, signal), [service, id]);
  const detail = useResource(load, Boolean(id && access.view));
  const loadLookups = useCallback(() => service.lookups(), [service]);
  const lookupResource = useResource(loadLookups, access.view);
  const lookups = lookupResource.data ?? EMPTY_LOOKUPS;
  const applySaved = useCallback((value: OpportunityDetail) => { persistedId.current = value.id; setSaved(value); setForm(value.form); setBaseline(JSON.stringify(value.form)); setClient(value.client); setSubmitted(false); setTouched({}); setRemoteValidation(undefined); }, []);
  useEffect(() => { if (detail.data) applySaved(detail.data); }, [detail.data, applySaved]);
  const dirty = JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty);
  const editable = saved ? access.edit && saved.allowedActions.includes('EDIT') && isPreparing(saved) : access.add;
  const titleQuery = useDebounce(form.title);
  const checkTitle = useCallback(async () => ({ title: titleQuery, duplicate: await findDuplicateTitle(service, titleQuery, persistedId.current) }), [service, titleQuery]);
  const titleCheck = useResource(checkTitle, editable && Boolean(touched.title && titleQuery.trim()));
  const fieldErrors = editable ? opportunityFieldErrors(form, lookups, client, saved?.form) : {};
  if (editable && form.ownerId && !owners.loading && !owners.error) { const error = ownerFieldError(form.ownerId, owners.users); if (error) fieldErrors.ownerId = error; }
  if (titleCheck.data?.duplicate && normalizedTitle(titleCheck.data.title) === normalizedTitle(form.title)) fieldErrors.title = 'An opportunity with this title already exists.';
  const readPath = (value: unknown, path: string): unknown => path.split('.').reduce<unknown>((item, key) => item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : undefined, value);
  for (const [key, error] of Object.entries(remoteValidation?.errors ?? {})) {
    const isClient = key.startsWith('client.');
    if (JSON.stringify(readPath(isClient ? client : form, isClient ? key.slice(7) : key)) === JSON.stringify(readPath(isClient ? remoteValidation?.client : remoteValidation?.form, isClient ? key.slice(7) : key))) fieldErrors[key] = error;
  }
  useSetPageTitle(saved ? 'Opportunity workspace' : 'New opportunity');
  const change = <K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) => setForm(f => ({ ...f, [key]: value }));
  async function save() {
    if (!editable) return;
    setSubmitted(true);
    if (Object.keys(fieldErrors).length) { focusInvalidField(formRef.current); return; }
    const identity = persistedId.current;
    await mutation.run(JSON.stringify({ identity, revision: saved?.revision, form }), async key => {
      const checked = await checkOpportunitySave(service, form, identity, saved?.form);
      lookupResource.setData(checked.lookups);
      setClient(checked.client);
      if (Object.keys(checked.errors).length) {
        setRemoteValidation({ form, client: checked.client, errors: checked.errors });
        focusInvalidField(formRef.current);
        throw new Error(FIELD_VALIDATION_FAILED);
      }
      setRemoteValidation(undefined);
      return service.save({ id: identity, expectedRevision: saved?.revision ?? null, idempotencyKey: identity ? key : creationKey.current, form });
    }, value => {
      applySaved(value);
      if (responseDirty) { if (!id) navigate(`/opportunity/${value.id}/edit`, { replace: true }); if (responseDirty) setSaveNote('Opportunity saved. Your unsaved answer or assignment is still here; save it before leaving.'); }
      else navigate(`/opportunity?saved=${encodeURIComponent(value.id)}`);
    }, 'Opportunity saved as Pending and queued for Sales Head.');
  }
  if (id && detail.loading && !saved) return <Loading />;
  if (id && detail.error) return <Notice error={detail.error} retry={detail.reload} />;
  if (!id && !access.add) return <Notice title="Access restricted" error="You do not have permission to create opportunities." />;
  return <div className="opp-page opp-form-page">
    <header className="opp-form-heading">
      <h1 className="sr-only">{saved ? 'Opportunity workspace' : 'New opportunity'}</h1>
      <Link to="/opportunity" className="opp-back">← Back to Pipeline</Link>
      {saved ? <Status state={saved.state} /> : <Badge variant="outline">Not saved yet</Badge>}
      <p className="text-muted-foreground">{saved ? `${saved.number} · ${saved.title}` : 'Add opportunity and client details. RFP preparation is optional.'}</p>
    </header>
    {!editable && <p className="opp-notice">Opportunity details are read-only for your permissions or this stage. Your permitted response actions remain available below.</p>}
    {lookupResource.error && <Notice title="Master data unavailable" error={lookupResource.error} retry={lookupResource.reload} />}
    <FieldValidationContext.Provider value={{ errors: fieldErrors, touched, submitted, touch }}><div ref={formRef} className="opp-intake"><div className="space-y-3"><Panel title="Opportunity details" description="The essentials for your sales pipeline" tone="violet"><fieldset disabled={!editable || mutation.saving} className="min-w-0 space-y-3"><div className="opp-fields opp-primary-fields"><div className="opp-field-full"><Field validationKey="title" label="Opportunity name / title" value={form.title} onChange={v => change('title', v)} required /></div><Field validationKey="estimatedValue" label="Estimated value" type="number" value={form.estimatedValue} onChange={v => change('estimatedValue', v)} required /><Choice validationKey="currencyId" label="Currency" value={form.currencyId} options={lookups.currencies} onChange={v => change('currencyId', v)} required /><Choice validationKey="serviceLine" label="Service line" value={form.serviceLine} options={serviceLineOptions} onChange={v => change('serviceLine', v)} required /><Choice validationKey="priority" label="Priority" value={form.priority} options={[{ id: 'LOW', label: 'Low' }, { id: 'MEDIUM', label: 'Medium' }, { id: 'HIGH', label: 'High' }]} onChange={v => change('priority', v as OpportunityDraft['priority'])} /><Choice validationKey="leadSource" label="Lead source" value={form.leadSource} options={leadSourceOptions} onChange={v => change('leadSource', v)} required /><OpportunityOwnerSelect value={form.ownerId} selected={saved?.owner} onChange={v => change('ownerId', v)} disabled={!editable || mutation.saving} /><div className="opp-field-full"><Field label="Description" multiline value={form.description} onChange={v => change('description', v)} /></div></div></fieldset></Panel><Panel title="Client & primary contact" tone="teal"><ClientPicker selected={client} lookups={lookups} disabled={!editable || mutation.saving} canCreate={access.clientCreate === true || saved?.allowedActions.includes('CLIENT_CREATE') === true} onSelect={selected => { setClient(selected); change('clientId', selected.id); touch('clientId'); setRemoteValidation(undefined); }} /></Panel></div>
      <Panel title="Build your RFP response" description="Choose a format to open its workspace" tone="indigo"><RfpPreparation form={form} setForm={setForm} saved={saved} disabled={!editable || mutation.saving} /></Panel>
    </div></FieldValidationContext.Provider>
    {saved?.visibleModules.includes('responses') && <section className="mt-6"><h3 className="mb-2 text-lg font-semibold">Question & answer progress</h3><p className="mb-4 text-sm text-muted-foreground">Opportunity form saves and answer submissions are separate. Unsaved answers are preserved while other form sections are saved.</p><ResponseWorkspace opportunity={saved} onSaved={value => { setSaved(value); /* Do not replace the independent unsaved form draft. */ }} formDirty={dirty} onDirtyChange={setResponseDirty} /></section>}
    {saveNote && responseDirty && <p role="status" className="opp-notice mt-4">{saveNote}</p>}
    <div className="opp-savebar"><p role="status" className="opp-save-status text-sm text-muted-foreground">{mutation.saving ? 'Saving opportunity…' : dirty ? 'Unsaved changes' : saved ? 'All form changes saved' : 'Save to add this opportunity to Pending.'}</p>{mutation.error && mutation.error !== FIELD_VALIDATION_FAILED && <Notice error={mutation.error} />}<div className="opp-save-actions"><Button type="button" disabled={!editable || mutation.saving} onClick={() => void save()}>{mutation.saving ? 'Saving…' : 'Save Opportunity'}</Button><Button type="button" variant="ghost" disabled={mutation.saving} onClick={() => { if (confirm()) navigate('/opportunity'); }}>Cancel</Button></div></div>
  </div>;
}
