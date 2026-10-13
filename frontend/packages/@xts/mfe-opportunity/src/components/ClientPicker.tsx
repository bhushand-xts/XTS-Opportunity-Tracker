import { useCallback, useEffect, useState } from 'react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@xts/design-system';
import type { ClientDraft, Contact, OpportunityClient, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource, useDebounce } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { Choice, Field, Loading, Notice, Values, options } from './ui';

function blankContact(): Contact { return { name: '', title: '', email: '', phone: '', decisionRole: '' }; }
export function blankClient(): ClientDraft { return { name: '', relationship: '', accountTypeId: '', industryId: '', website: '', address: '', country: '', stateProvince: '', city: '', streetAddress: '', primaryContact: blankContact(), additionalContacts: [] }; }
function ContactFields({ value, onChange }: { value: Contact; onChange: (value: Contact) => void }) {
  return <div className="opp-fields">
    {(['name', 'title', 'email', 'phone'] as const).map((key, i) => <Field key={key} label={['Full name', 'Title / role', 'Email', 'Phone'][i]} value={value[key] ?? ''} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} onChange={next => onChange({ ...value, [key]: next })} required />)}
    <Choice label="Role in decision" value={value.decisionRole ?? ''} options={options(['Procurement lead', 'Decision maker', 'Influencer'])} onChange={next => onChange({ ...value, decisionRole: next })} required />
  </div>;
}
function ClientDrawer({ client, open, setOpen, lookups, canCreate, onSaved }: { client: OpportunityClient | null; open: boolean; setOpen: (open: boolean) => void; lookups: OpportunityLookups; canCreate: boolean; onSaved: (client: OpportunityClient) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [form, setForm] = useState<ClientDraft>(client ?? blankClient()), [baseline, setBaseline] = useState(''), [validation, setValidation] = useState<string>();
  useEffect(() => { if (open) { const initial = client ?? blankClient(); setForm(initial); setBaseline(JSON.stringify(initial)); setValidation(undefined); } }, [client, open]);
  const dirty = open && JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty);
  const permitted = client ? client.allowedActions.includes('CLIENT_UPDATE') : canCreate;
  function change<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { setForm(f => ({ ...f, [key]: value })); }
  async function save() {
    if (!permitted) return;
    const contact = form.primaryContact;
    if (![form.name, form.accountTypeId, form.industryId, form.country, form.stateProvince, form.city, contact.name, contact.title, contact.email, contact.phone, contact.decisionRole].every(v => v.trim())) { setValidation('Complete the required client and primary-contact fields.'); return; }
    if (![contact.email, ...form.additionalContacts.map(c => c.email)].every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) { setValidation('Enter a valid email for every contact.'); return; }
    if (form.additionalContacts.some(c => ![c.name, c.title, c.email, c.phone, c.decisionRole].every(value => value?.trim()))) { setValidation('Complete the required fields for every additional contact.'); return; }
    if (form.website && !/^https?:\/\/\S+$/.test(form.website)) { setValidation('Enter an HTTP or HTTPS website URL.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ id: client?.id, form }), key => service.saveClient({ id: client?.id ?? null, expectedRevision: client?.revision ?? null, idempotencyKey: key, form }), saved => { setBaseline(JSON.stringify(form)); onSaved(saved); setOpen(false); }, 'Client saved and linked.');
  }
  return <Sheet open={open} onOpenChange={value => { if (!mutation.saving && (!dirty || confirm())) setOpen(value); }}><SheetContent className="opp-drawer flex w-full flex-col sm:max-w-lg" onInteractOutside={e => { if (dirty || mutation.saving) e.preventDefault(); }}><SheetHeader><SheetTitle>{client ? 'Edit client' : 'Add client'}</SheetTitle><SheetDescription>{client ? 'This updates the shared client record for every linked opportunity.' : 'Create a client in the shared directory.'}</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
    {!permitted && <Notice title="Client changes unavailable" error="Client creation/update requires explicit backend permission and a connected client service." />}
    {validation && <Notice error={validation} />}{mutation.error && <Notice error={mutation.error} />}
    <div className="opp-fields"><div className="opp-field-full"><Field label="Organization / account name" value={form.name} onChange={v => change('name', v)} required /></div><Choice label="Account type" value={form.accountTypeId} options={lookups.accountTypes} onChange={v => change('accountTypeId', v)} required /><Choice label="Sector / industry" value={form.industryId} options={lookups.industries} onChange={v => change('industryId', v)} required /><Field label="Website" value={form.website} onChange={v => change('website', v)} type="url" /><div className="opp-field-full"><Field label="Address" value={form.address} onChange={v => change('address', v)} hint="Postal/display address, stored separately from structured location fields." /></div>{(['country', 'stateProvince', 'city'] as const).map((k, i) => <Field key={k} label={['Country', 'State / province', 'City'][i]} value={form[k]} onChange={v => change(k, v)} required />)}</div>
    <h3 className="border-t pt-4 font-semibold">Primary contact</h3><ContactFields value={form.primaryContact} onChange={value => change('primaryContact', value)} />
    <div className="flex items-center justify-between border-t pt-4"><h3 className="font-semibold">Additional contacts</h3><Button type="button" variant="link" onClick={() => change('additionalContacts', [...form.additionalContacts, blankContact()])}>Add contact</Button></div>
    {form.additionalContacts.map((contact, index) => <fieldset key={index} className="min-w-0 space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Contact {index + 1}</legend>
      <ContactFields value={contact} onChange={value => change('additionalContacts', form.additionalContacts.map((c, i) => i === index ? value : c))} />
      <Button type="button" variant="ghost" onClick={() => change('additionalContacts', form.additionalContacts.filter((_, i) => i !== index))}>Remove contact {index + 1}</Button>
    </fieldset>)}
  </div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={mutation.saving} onClick={() => { if (!dirty || confirm()) setOpen(false); }}>Cancel</Button><Button type="button" disabled={!permitted || mutation.saving} onClick={() => void save()}>{mutation.saving ? 'Saving…' : 'Save client'}</Button></div></SheetContent></Sheet>;
}
export function ClientPicker({ selected, onSelect, lookups, disabled, canCreate }: { selected: OpportunityClient | null; onSelect: (client: OpportunityClient) => void; lookups: OpportunityLookups; disabled: boolean; canCreate: boolean }) {
  const service = useOpportunityService(), [search, setSearch] = useState(''), [active, setActive] = useState(false), [after, setAfter] = useState<string | null>(null), [drawer, setDrawer] = useState(false), [editing, setEditing] = useState<OpportunityClient | null>(null);
  const query = useDebounce(search);
  const load = useCallback((signal: AbortSignal) => service.clients(query, after, signal), [service, query, after]);
  const resource = useResource(load, active && !disabled);
  return <div className="space-y-3"><div className="opp-client-search"><div onFocus={() => setActive(true)}><Field label="Search client" value={search} onChange={v => { setSearch(v); setAfter(null); setActive(true); }} disabled={disabled} hint="Search organization, contact or email in the client directory." /></div><Button type="button" variant="link" disabled={disabled} onClick={() => { setEditing(null); setDrawer(true); }}>Add Client</Button></div>
    {active && <div aria-live="polite" className="space-y-2">{resource.loading && <Loading label="Searching clients…" />}{resource.error && <Notice error={resource.error} retry={resource.reload} title="Client search unavailable" />}{resource.data?.nodes.length === 0 && <p className="text-sm text-muted-foreground">No clients found. Try another keyword.</p>}{resource.data?.nodes.map(c => <Button key={c.id} type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { onSelect(c); setActive(false); setSearch(''); }}><span><strong>{c.name}</strong><small className="block text-muted-foreground">{c.city} · {c.primaryContact.name} · {c.primaryContact.email}</small></span></Button>)}{resource.data?.hasNextPage && <Button type="button" variant="outline" onClick={() => setAfter(resource.data?.endCursor ?? null)}>More clients</Button>}</div>}
    {selected && <div className="opp-client-summary"><div className="flex flex-wrap justify-between gap-2"><strong>{selected.name}</strong>{selected.allowedActions.includes('CLIENT_UPDATE') && <Button type="button" variant="link" disabled={disabled} onClick={() => { setEditing(selected); setDrawer(true); }}>Edit Client</Button>}</div><p className="mt-1 break-words text-xs text-muted-foreground">{selected.primaryContact.name} · {selected.primaryContact.email}</p><details className="opp-client-details"><summary>Client details & contacts</summary><ClientValues client={selected} /></details></div>}
    <ClientDrawer client={editing} open={drawer} setOpen={setDrawer} lookups={lookups} canCreate={canCreate} onSaved={client => { onSelect(client); resource.reload(); setActive(false); }} />
  </div>;
}
export function ClientValues({ client: c }: { client: OpportunityClient }) { return <><Values values={[
  ['Account type', c.accountTypeName], ['Sector / industry', c.industryName], ['Website', c.website], ['Address', c.address], ['Country', c.country], ['State / province', c.stateProvince], ['City', c.city], ['Primary contact', c.primaryContact.name], ['Title / role', c.primaryContact.title], ['Email', c.primaryContact.email], ['Phone', c.primaryContact.phone], ['Role in decision', c.primaryContact.decisionRole],
]} />{c.additionalContacts.map((contact, i) => <div key={contact.id ?? i} className="mt-3 border-t pt-3"><h4 className="mb-2 text-sm font-semibold">Additional contact {i + 1}</h4><Values values={[
  ['Full name', contact.name], ['Title / role', contact.title], ['Email', contact.email], ['Phone', contact.phone], ['Role in decision', contact.decisionRole],
]} /></div>)}</>; }
