import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Badge, useSetPageTitle } from '@xts/design-system';
import type { OpportunityClient, OpportunityDetail, OpportunityDraft, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { useResource } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { isPreparing, newDraft, pendingSaveErrors } from '../lib/workflow';
import { Choice, Field, Loading, Notice, Panel, Status, options } from './ui';
import { ClientPicker } from './ClientPicker';
import { OpportunityOwnerSelect } from './OpportunityOwnerSelect';
import { RfpPreparation } from './RfpPreparation';
import { ResponseWorkspace } from './ResponseWorkspace';

const EMPTY_LOOKUPS: OpportunityLookups = { currencies: [], industries: [], accountTypes: [] };
export function OpportunityFormPage() {
  const { id } = useParams(), access = useOpportunityAccess(), service = useOpportunityService(), navigate = useNavigate(), mutation = useSave();
  const [form, setForm] = useState<OpportunityDraft>(() => newDraft(access.userId ?? ''));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form)), [saved, setSaved] = useState<OpportunityDetail>(), [client, setClient] = useState<OpportunityClient | null>(null), [validation, setValidation] = useState<string[]>([]), [responseDirty, setResponseDirty] = useState(false), [saveNote, setSaveNote] = useState<string>();
  const persistedId = useRef<string | null>(id ?? null);
  const creationKey = useRef(crypto.randomUUID());
  const load = useCallback((signal: AbortSignal) => service.detail(id!, signal), [service, id]);
  const detail = useResource(load, Boolean(id && access.view));
  const loadLookups = useCallback(() => service.lookups(), [service]);
  const lookupResource = useResource(loadLookups, access.view);
  const lookups = lookupResource.data ?? EMPTY_LOOKUPS;
  const applySaved = useCallback((value: OpportunityDetail) => { persistedId.current = value.id; setSaved(value); setForm(value.form); setBaseline(JSON.stringify(value.form)); setClient(value.client); }, []);
  useEffect(() => { if (detail.data) applySaved(detail.data); }, [detail.data, applySaved]);
  const dirty = JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty);
  const editable = saved ? access.edit && saved.allowedActions.includes('EDIT') && isPreparing(saved) : access.add;
  useSetPageTitle(saved ? 'Opportunity workspace' : 'New opportunity');
  const change = <K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) => setForm(f => ({ ...f, [key]: value }));
  async function save(continueWorking: boolean) {
    if (!editable) return;
    const errors = pendingSaveErrors(form); setValidation(errors); if (errors.length) return;
    const identity = persistedId.current;
    await mutation.run(JSON.stringify({ identity, revision: saved?.revision, form }), key => service.save({ id: identity, expectedRevision: saved?.revision ?? null, idempotencyKey: identity ? key : creationKey.current, form }), value => {
      applySaved(value);
      if (continueWorking || responseDirty) { if (!id) navigate(`/opportunity/${value.id}/edit`, { replace: true }); if (responseDirty) setSaveNote('Opportunity saved. Your unsaved answer or assignment is still here; save it before leaving.'); }
      else navigate(`/opportunity?saved=${encodeURIComponent(value.id)}`);
    }, continueWorking ? 'Opportunity saved as Pending and queued for Sales Head. Continue working below.' : 'Opportunity saved as Pending and queued for Sales Head.');
  }
  if (id && detail.loading && !saved) return <Loading />;
  if (id && detail.error) return <Notice error={detail.error} retry={detail.reload} />;
  if (!id && !access.add) return <Notice title="Access restricted" error="You do not have permission to create opportunities." />;
  return <div className="opp-page">
    <Link to="/opportunity" className="opp-back">← Back to Pipeline</Link><div className="opp-heading"><div><h2>{saved ? 'Opportunity workspace' : 'New opportunity'}</h2><p className="text-sm text-muted-foreground">{saved ? `${saved.number} · ${saved.title}` : 'Start with the opportunity and client. Prepare the RFP alongside it.'}</p></div>{saved ? <Status state={saved.state} /> : <Badge variant="outline">Not saved yet</Badge>}</div>
    {!editable && <p className="opp-notice">Opportunity details are read-only for your permissions or this stage. Your permitted response actions remain available below.</p>}
    {lookupResource.error && <Notice title="Master data unavailable" error={lookupResource.error} retry={lookupResource.reload} />}
    <div className="opp-intake"><div className="space-y-5"><Panel title="Opportunity details" description="The essentials for your sales pipeline" tone="violet"><fieldset disabled={!editable || mutation.saving} className="min-w-0 space-y-5"><div className="opp-fields"><div className="sm:col-span-2"><Field label="Opportunity name / title" value={form.title} onChange={v => change('title', v)} required /></div><Field label="Estimated value" type="number" value={form.estimatedValue} onChange={v => change('estimatedValue', v)} required /><Choice label="Currency" value={form.currencyId} options={lookups.currencies} onChange={v => change('currencyId', v)} required /><Field label="Service line" value={form.serviceLine} onChange={v => change('serviceLine', v)} required /><Choice label="Priority" value={form.priority} options={[{ id: 'LOW', label: 'Low' }, { id: 'MEDIUM', label: 'Medium' }, { id: 'HIGH', label: 'High' }]} onChange={v => change('priority', v as OpportunityDraft['priority'])} /><Choice label="Lead source" value={form.leadSource} options={options(['Inbound', 'Referral', 'Outbound', 'Tender portal', 'Partner', 'RFP / Tender', 'Direct enquiry'])} onChange={v => change('leadSource', v)} /><OpportunityOwnerSelect value={form.ownerId} selected={saved?.owner} onChange={v => change('ownerId', v)} disabled={!editable || mutation.saving} /><div className="sm:col-span-2"><Field label="Description" multiline value={form.description} onChange={v => change('description', v)} /></div></div></fieldset></Panel><Panel title="Client & primary contact" tone="teal"><ClientPicker selected={client} lookups={lookups} disabled={!editable || mutation.saving} canCreate={access.clientCreate === true || saved?.allowedActions.includes('CLIENT_CREATE') === true} onSelect={selected => { setClient(selected); change('clientId', selected.id); }} /></Panel></div>
      <Panel title="Build your RFP response" description="Choose a format to open its workspace" tone="indigo"><RfpPreparation form={form} setForm={setForm} saved={saved} disabled={!editable || mutation.saving} dirty={dirty} onServerSaved={applySaved} /></Panel>
    </div>
    {saved?.visibleModules.includes('responses') && <section className="mt-6"><h3 className="mb-2 text-lg font-semibold">Question & answer progress</h3><p className="mb-4 text-sm text-muted-foreground">Opportunity form saves and answer submissions are separate. Unsaved answers are preserved while other form sections are saved.</p><ResponseWorkspace opportunity={saved} onSaved={value => { setSaved(value); /* Do not replace the independent unsaved form draft. */ }} formDirty={dirty} onDirtyChange={setResponseDirty} /></section>}
    {saveNote && responseDirty && <p role="status" className="opp-notice mt-4">{saveNote}</p>}
    <div className="opp-savebar"><p role="status" className="mb-3 text-sm text-muted-foreground">{mutation.saving ? 'Saving opportunity…' : dirty ? 'Unsaved changes' : saved ? 'All form changes saved' : 'Save to add this opportunity to Pending.'}</p>{validation.length > 0 && <Notice title="Check the required fields" error={validation.join(' ')} />}{mutation.error && <Notice error={mutation.error} />}<div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={!editable || mutation.saving} onClick={() => void save(false)}>{mutation.saving ? 'Saving…' : 'Save Opportunity'}</Button><Button type="button" variant="outline" disabled={!editable || mutation.saving} onClick={() => void save(true)}>Save & Continue</Button><Button type="button" variant="ghost" disabled={mutation.saving} onClick={() => { if (confirm()) navigate('/opportunity'); }}>Cancel</Button></div></div>
  </div>;
}
