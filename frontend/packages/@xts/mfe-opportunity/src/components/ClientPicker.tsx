import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@xts/design-system';
import type { ClientDraft, Contact, OpportunityClient, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource, useDebounce } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { FieldValidationContext, focusInvalidField } from './FieldValidation';
import { clientFieldErrors } from '../lib/intakeValidation';
import { DECISION_ROLES } from '../lib/intakeOptions';
import { Choice, Field, Loading, Notice, Values, options } from './ui';

function blankContact(): Contact { return { name: '', title: '', email: '', phone: '', decisionRole: '' }; }
export function blankClient(): ClientDraft { return { name: '', relationship: '', accountTypeId: '', industryId: '', website: '', address: '', country: '', stateProvince: '', city: '', streetAddress: '', primaryContact: blankContact(), additionalContacts: [] }; }
function ContactFields({ value, onChange, prefix }: { value: Contact; onChange: (value: Contact) => void; prefix: string }) {
  return <div className="opp-fields">
    {(['name', 'title', 'email', 'phone'] as const).map((key, i) => <Field key={key} validationKey={`${prefix}.${key}`} label={['Full name', 'Title / role', 'Email', 'Phone'][i]} value={value?.[key] ?? ''} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} onChange={next => onChange({ ...value, [key]: next })} required />)}
    <Choice validationKey={`${prefix}.decisionRole`} label="Role in decision" value={value?.decisionRole ?? ''} options={options(DECISION_ROLES)} onChange={next => onChange({ ...value, decisionRole: next })} required />
  </div>;
}
function ClientDrawer({ client, open, setOpen, lookups, canCreate, onSaved }: { client: OpportunityClient | null; open: boolean; setOpen: (open: boolean) => void; lookups: OpportunityLookups; canCreate: boolean; onSaved: (client: OpportunityClient) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [form, setForm] = useState<ClientDraft>(client ?? blankClient()), [baseline, setBaseline] = useState(''), [submitted, setSubmitted] = useState(false), [touched, setTouched] = useState<Record<string, boolean>>({});
  useEffect(() => { if (open) { const initial = client ?? blankClient(); setForm(initial); setBaseline(JSON.stringify(initial)); setSubmitted(false); setTouched({}); } }, [client, open]);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const errors = clientFieldErrors(form, lookups);
  const touch = (key: string) => { if (!touched[key]) setTouched(previous => ({ ...previous, [key]: true })); };
  const dirty = open && JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty);
  const permitted = client ? client.allowedActions.includes('CLIENT_UPDATE') : canCreate;
  function change<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { setForm(f => ({ ...f, [key]: value })); }
  async function save() {
    if (!permitted) return;
    setSubmitted(true);
    if (Object.keys(errors).length) { focusInvalidField(fieldsRef.current); return; }
    await mutation.run(JSON.stringify({ id: client?.id, form }), key => service.saveClient({ id: client?.id ?? null, expectedRevision: client?.revision ?? null, idempotencyKey: key, form }), saved => { setBaseline(JSON.stringify(form)); onSaved(saved); setOpen(false); }, 'Client saved and linked.');
  }
  return <Sheet open={open} onOpenChange={value => { if (!mutation.saving && (!dirty || confirm())) setOpen(value); }}><SheetContent className="opp-drawer flex w-full flex-col sm:max-w-lg" onInteractOutside={e => { if (dirty || mutation.saving) e.preventDefault(); }}><SheetHeader><SheetTitle>{client ? 'Edit client' : 'Add client'}</SheetTitle><SheetDescription>{client ? 'This updates the shared client record for every linked opportunity.' : 'Create a client in the shared directory.'}</SheetDescription></SheetHeader><FieldValidationContext.Provider value={{ errors, touched, submitted, touch }}><div ref={fieldsRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
    {!permitted && <Notice title="Client changes unavailable" error="Client creation/update requires explicit backend permission and a connected client service." />}
    {mutation.error && <Notice error={mutation.error} />}
    <div className="opp-fields"><div className="opp-field-full"><Field validationKey="name" label="Organization / account name" value={form.name} onChange={v => change('name', v)} required /></div><Choice validationKey="accountTypeId" label="Account type" value={form.accountTypeId} options={lookups.accountTypes} onChange={v => change('accountTypeId', v)} required /><Choice validationKey="industryId" label="Sector / industry" value={form.industryId} options={lookups.industries} onChange={v => change('industryId', v)} required /><Field validationKey="website" label="Website" value={form.website} onChange={v => change('website', v)} type="url" /><div className="opp-field-full"><Field label="Address" value={form.address} onChange={v => change('address', v)} hint="Postal/display address, stored separately from structured location fields." /></div>{(['country', 'stateProvince', 'city'] as const).map((k, i) => <Field key={k} validationKey={k} label={['Country', 'State / province', 'City'][i]} value={form[k]} onChange={v => change(k, v)} required />)}</div>
    <h3 className="border-t pt-4 font-semibold">Primary contact</h3><ContactFields prefix="primaryContact" value={form.primaryContact} onChange={value => change('primaryContact', value)} />
    <div className="flex items-center justify-between border-t pt-4"><h3 className="font-semibold">Additional contacts</h3><Button type="button" variant="link" onClick={() => change('additionalContacts', [...form.additionalContacts, blankContact()])}>Add contact</Button></div>
    {form.additionalContacts.map((contact, index) => <fieldset key={index} className="min-w-0 space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Contact {index + 1}</legend>
      <ContactFields prefix={`additionalContacts.${index}`} value={contact} onChange={value => change('additionalContacts', form.additionalContacts.map((c, i) => i === index ? value : c))} />
      <Button type="button" variant="ghost" onClick={() => { change('additionalContacts', form.additionalContacts.filter((_, i) => i !== index)); setTouched(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith('additionalContacts.')))); }}>Remove contact {index + 1}</Button>
    </fieldset>)}
  </div></FieldValidationContext.Provider><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={mutation.saving} onClick={() => { if (!dirty || confirm()) setOpen(false); }}>Cancel</Button><Button type="button" disabled={!permitted || mutation.saving} onClick={() => void save()}>{mutation.saving ? 'Saving…' : 'Save client'}</Button></div></SheetContent></Sheet>;
}
export function ClientPicker({ selected, onSelect, lookups, disabled, canCreate }: { selected: OpportunityClient | null; onSelect: (client: OpportunityClient) => void; lookups: OpportunityLookups; disabled: boolean; canCreate: boolean }) {
  const service = useOpportunityService(), [search, setSearch] = useState(''), [active, setActive] = useState(false), [after, setAfter] = useState<string | null>(null), [drawer, setDrawer] = useState(false), [editing, setEditing] = useState<OpportunityClient | null>(null);
  const validation = useContext(FieldValidationContext);
  const clientErrors = validation && (validation.submitted || validation.touched.clientId) ? Object.fromEntries(Object.entries(validation.errors).filter(([key]) => key.startsWith('client.')).map(([key, value]) => [key.slice(7), value])) : {};
  const query = useDebounce(search);
  const load = useCallback((signal: AbortSignal) => service.clients(query, after, signal), [service, query, after]);
  const resource = useResource(load, active && !disabled);
  return <div className="space-y-3"><div className="opp-client-search"><div onFocus={() => setActive(true)}><Field validationKey="clientId" label="Search client" value={search} onChange={v => { setSearch(v); setAfter(null); setActive(true); }} disabled={disabled} hint="Search organization, contact or email in the client directory." /></div><Button type="button" variant="link" disabled={disabled} onClick={() => { setEditing(null); setDrawer(true); }}>Add Client</Button></div>
    {active && <div aria-live="polite" className="space-y-2">{resource.loading && <Loading label="Searching clients…" />}{resource.error && <Notice error={resource.error} retry={resource.reload} title="Client search unavailable" />}{resource.data?.nodes.length === 0 && <p className="text-sm text-muted-foreground">No clients found. Try another keyword.</p>}{resource.data?.nodes.map(c => <Button key={c.id} type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { onSelect(c); setActive(false); setSearch(''); }}><span><strong>{c.name}</strong><small className="block text-muted-foreground">{c.city} · {c.primaryContact?.name ?? ''} · {c.primaryContact?.email ?? ''}</small></span></Button>)}{resource.data?.hasNextPage && <Button type="button" variant="outline" onClick={() => setAfter(resource.data?.endCursor ?? null)}>More clients</Button>}</div>}
    {selected && <div className="opp-client-summary"><div className="flex flex-wrap justify-between gap-2"><strong>{selected.name}</strong>{selected.allowedActions.includes('CLIENT_UPDATE') && <Button type="button" variant="link" disabled={disabled} onClick={() => { setEditing(selected); setDrawer(true); }}>Edit Client</Button>}</div><p className="mt-1 break-words text-xs text-muted-foreground">{selected.primaryContact?.name ?? ''} · {selected.primaryContact?.email ?? ''}</p><details className="opp-client-details" open={Object.keys(clientErrors).length > 0 ? true : undefined}><summary>Client details & contacts</summary><ClientValues client={selected} errors={clientErrors} /></details></div>}
    <ClientDrawer client={editing} open={drawer} setOpen={setDrawer} lookups={lookups} canCreate={canCreate} onSaved={client => { onSelect(client); resource.reload(); setActive(false); }} />
  </div>;
}
export function ClientValues({ client: c, errors = {} }: { client: OpportunityClient; errors?: Record<string, string> }) { return <><Values errors={Object.fromEntries([['Organization / account name', 'name'], ['Account type', 'accountTypeId'], ['Sector / industry', 'industryId'], ['Website', 'website'], ['Country', 'country'], ['State / province', 'stateProvince'], ['City', 'city'], ['Primary contact', 'primaryContact.name'], ['Title / role', 'primaryContact.title'], ['Email', 'primaryContact.email'], ['Phone', 'primaryContact.phone'], ['Role in decision', 'primaryContact.decisionRole']].map(([label, key]) => [label, errors[key]]))} values={[
  ['Organization / account name', c.name], ['Account type', c.accountTypeName], ['Sector / industry', c.industryName], ['Website', c.website], ['Address', c.address], ['Country', c.country], ['State / province', c.stateProvince], ['City', c.city], ['Primary contact', c.primaryContact?.name ?? ''], ['Title / role', c.primaryContact?.title ?? ''], ['Email', c.primaryContact?.email ?? ''], ['Phone', c.primaryContact?.phone ?? ''], ['Role in decision', c.primaryContact?.decisionRole ?? ''],
]} />{(c.additionalContacts ?? []).map((contact, i) => <div key={contact.id ?? i} className="mt-3 border-t pt-3"><h4 className="mb-2 text-sm font-semibold">Additional contact {i + 1}</h4><Values errors={Object.fromEntries([['Full name', 'name'], ['Title / role', 'title'], ['Email', 'email'], ['Phone', 'phone'], ['Role in decision', 'decisionRole']].map(([label, key]) => [label, errors[`additionalContacts.${i}.${key}`]]))} values={[
  ['Full name', contact.name], ['Title / role', contact.title], ['Email', contact.email], ['Phone', contact.phone], ['Role in decision', contact.decisionRole],
]} /></div>)}</>; }
