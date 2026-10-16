import { FieldValidationContext, useFieldError } from './FieldValidation';
import { useCallback, useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@xts/design-system';
import { SearchableSelect } from './SearchableSelect';
import { LocationFields } from './LocationFields';
import type { ClientDraft, Contact, OpportunityClient, OpportunityLookups } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { useSave } from '../hooks/useSave';
import { useUnsaved } from '../hooks/useUnsaved';
import { Choice, Field, Loading, Notice, Values, options } from './ui';

function blankContact(): Contact { return { name: '', title: '', email: '', phone: '', decisionRole: '' }; }
export function blankClient(): ClientDraft { return { name: '', relationship: '', accountTypeId: '', industryId: '', website: '', address: '', country: '', stateProvince: '', city: '', streetAddress: '', primaryContact: blankContact(), additionalContacts: [] }; }
import { DECISION_ROLES } from '../lib/opportunityOptions';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d+$/;

function contactFieldErrors(contact: Contact) {
  const errors: Record<string, string> = {};
  if (!contact.name.trim()) errors['Full name'] = 'Please fill the Full name.';
  if (!contact.title.trim()) errors['Title / role'] = 'Please fill the Title / role.';
  if (!contact.email.trim()) errors.Email = 'Please fill the Email.';
  else if (!EMAIL_PATTERN.test(contact.email)) errors.Email = 'Enter a valid email address.';
  if (!contact.phone.trim()) errors.Phone = 'Please fill the Phone.';
  else if (!PHONE_PATTERN.test(contact.phone)) errors.Phone = 'Enter digits only for Phone.';
  if (contact.decisionRole === 'Other' && !contact.decisionRoleOther?.trim()) errors['Other role in decision'] = 'Please fill the Other role in decision.';
  if ((contact.decisionRoleOther?.trim().length ?? 0) > 255) errors['Other role in decision'] = 'Other role must be at most 255 characters.';
  if (!contact.decisionRole.trim()) errors['Role in decision'] = 'Please select a Role in decision.';
  return errors;
}

function ContactFields({ value, onChange, validate }: { value: Contact; onChange: (value: Contact) => void; validate: boolean }) {
  return <FieldValidationContext.Provider value={validate ? contactFieldErrors(value) : {}}><div className="opp-fields">
    {(['name', 'title', 'email', 'phone'] as const).map((key, i) => <Field key={key} label={['Full name', 'Title / role', 'Email', 'Phone'][i]} value={value[key] ?? ''} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} onChange={next => onChange({ ...value, [key]: next })} required />)}
    <Choice searchable label="Role in decision" value={value.decisionRole ?? ''} options={options(DECISION_ROLES)} onChange={next => onChange({ ...value, decisionRole: next })} required />
    {value.decisionRole === 'Other' && <Field label="Other role in decision" value={value.decisionRoleOther ?? ''} onChange={next => onChange({ ...value, decisionRoleOther: next })} required />}
  </div></FieldValidationContext.Provider>;
}
function ClientDrawer({ client, open, setOpen, lookups, canCreate, canUpdate, onSaved }: { client: OpportunityClient | null; open: boolean; setOpen: (open: boolean) => void; lookups: OpportunityLookups; canCreate: boolean; canUpdate: boolean; onSaved: (client: OpportunityClient) => void }) {
  const service = useOpportunityService(), mutation = useSave();
  const [form, setForm] = useState<ClientDraft>(client ?? blankClient()), [baseline, setBaseline] = useState(''), [validation, setValidation] = useState<string>();
  useEffect(() => { if (open) {
    const initial = client ? { ...client,
      accountTypeId: lookups.accountTypes.find(option => option.id === client.accountTypeId || option.label === client.accountTypeName)?.id ?? client.accountTypeId,
      industryId: lookups.industries.find(option => option.id === client.industryId || option.label === client.industryName)?.id ?? client.industryId,
    } : blankClient();
    setForm(initial); setBaseline(JSON.stringify(initial)); setValidation(undefined);
  } }, [client, open, lookups]);
  const dirty = open && JSON.stringify(form) !== baseline, confirm = useUnsaved(dirty);
  const permitted = client ? canUpdate || client.allowedActions.includes('CLIENT_UPDATE') : canCreate;
  function change<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { setForm(f => ({ ...f, [key]: value })); }
  function clientFieldErrors() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors['Organization / account name'] = 'Please fill the Organization / account name.';
    if (!form.accountTypeId.trim()) errors['Account type'] = 'Please select an Account type.';
    if (!form.industryId.trim()) errors['Sector / industry'] = 'Please select a Sector / industry.';
    if (!form.website.trim()) errors.Website = 'Please fill the Website.';
    else if (!/^https?:\/\/\S+$/.test(form.website)) errors.Website = 'Enter an HTTP or HTTPS website URL.';
    if (!form.streetAddress.trim()) errors['Street address'] = 'Please fill the Street address.';
    if (!form.country.trim()) errors.Country = 'Please fill the Country.';
    if (!form.stateProvince.trim()) errors['State / province'] = 'Please fill the State / province.';
    if (!form.city.trim()) errors.City = 'Please fill the City.';
    return errors;
  }
  async function save() {
    if (!permitted) return;
    const errors = clientFieldErrors();
    if (Object.keys(errors).length || [form.primaryContact, ...form.additionalContacts].some(contact => Object.keys(contactFieldErrors(contact)).length)) { setValidation('Complete the required client and contact fields.'); return; }
    setValidation(undefined);
    await mutation.run(JSON.stringify({ id: client?.id, form }), key => service.saveClient({ id: client?.id ?? null, expectedRevision: client?.revision ?? null, idempotencyKey: key, form }), saved => { setBaseline(JSON.stringify(form)); onSaved(saved); setOpen(false); }, 'Client saved and linked.');
  }
  return <Sheet open={open} onOpenChange={async value => { if (!mutation.saving && (!dirty || await confirm())) setOpen(value); }}><SheetContent className="opp-drawer flex w-full flex-col sm:max-w-lg" onInteractOutside={e => { if (dirty || mutation.saving) e.preventDefault(); }}><SheetHeader><SheetTitle>{client ? 'Edit client' : 'Add client'}</SheetTitle><SheetDescription>{client ? 'This updates the shared client record for every linked opportunity.' : 'Create a client in the shared directory.'}</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
    {!permitted && <Notice title="Client changes unavailable" error="Client creation/update requires explicit backend permission and a connected client service." />}
    {mutation.error && <Notice error={mutation.error} />}
    <FieldValidationContext.Provider value={validation ? clientFieldErrors() : {}}><div className="opp-fields"><div className="opp-field-full"><Field label="Organization / account name" value={form.name} onChange={v => change('name', v)} required /></div><Choice searchable label="Account type" value={form.accountTypeId} options={lookups.accountTypes} onChange={v => change('accountTypeId', v)} required /><Choice label="Sector / industry" value={form.industryId} options={lookups.industries} onChange={v => change('industryId', v)} required /><Field label="Website" value={form.website} onChange={v => change('website', v)} type="url" required /><div className="opp-field-full"><Field label="Street address" value={form.streetAddress} onChange={v => change('streetAddress', v)} required /></div><LocationFields value={form} onChange={patch => setForm(current => ({ ...current, ...patch }))} /></div>
    <h3 className="border-t pt-4 font-semibold">Primary contact</h3><ContactFields validate={Boolean(validation)} value={form.primaryContact} onChange={value => change('primaryContact', value)} />
    <div className="flex items-center justify-between border-t pt-4"><h3 className="font-semibold">Additional contacts</h3><Button type="button" variant="link" onClick={() => change('additionalContacts', [...form.additionalContacts, blankContact()])}>Add contact</Button></div>
    {form.additionalContacts.map((contact, index) => <fieldset key={index} className="min-w-0 space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Contact {index + 1}</legend>
      <ContactFields validate={Boolean(validation)} value={contact} onChange={value => change('additionalContacts', form.additionalContacts.map((c, i) => i === index ? value : c))} />
      <Button type="button" variant="ghost" onClick={() => change('additionalContacts', form.additionalContacts.filter((_, i) => i !== index))}>Remove contact {index + 1}</Button>
    </fieldset>)}
    </FieldValidationContext.Provider>
  </div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={mutation.saving} onClick={async () => { if (!dirty || await confirm()) setOpen(false); }}>Cancel</Button><Button type="button" disabled={!permitted || mutation.saving} onClick={async () => void save()}>{mutation.saving ? 'Saving…' : 'Save client'}</Button></div></SheetContent></Sheet>;
}
export function ClientPicker({ selected, onSelect, lookups, disabled, canCreate, canUpdate = false }: { selected: OpportunityClient | null; onSelect: (client: OpportunityClient | null) => void; lookups: OpportunityLookups; disabled: boolean; canCreate: boolean; canUpdate?: boolean }) {
  const service = useOpportunityService(), [drawer, setDrawer] = useState(false), [editing, setEditing] = useState<OpportunityClient | null>(null);
  const load = useCallback((signal: AbortSignal) => service.clients('', null, signal), [service]);
  const resource = useResource(load, !disabled, 30000);
  const clientFieldId = useId(), fieldError = useFieldError('Client');
  async function refreshClients() {
    try { resource.setData(await service.clients('', null)); } catch { resource.reload(); }
  }
  const clients = [...(resource.data?.nodes ?? [])];
  if (selected && !clients.some(client => client.id === selected.id)) clients.unshift(selected);
  return <div className="space-y-3"><div className="opp-client-search">
    <div className="opp-field min-w-0 space-y-1"><Label htmlFor={clientFieldId} className={fieldError ? 'text-destructive' : undefined}>Client <span className="text-destructive">*</span></Label>
      <div className="flex min-w-0 items-center gap-2"><SearchableSelect id={clientFieldId} label="Client" value={selected?.id ?? ''} options={clients.map(client => ({ id: client.id, label: client.name, keywords: [client.primaryContact.name, client.primaryContact.email] }))} disabled={disabled || resource.loading || Boolean(resource.error)} onOpenChange={open => { if (open) void refreshClients(); }} onChange={id => { const client = clients.find(item => item.id === id); if (client) onSelect(client); }} required error={fieldError} placeholder="Select client" />
      {selected && <Button type="button" variant="ghost" size="icon" className="shrink-0" title="Clear selected client" aria-label="Clear selected client" disabled={disabled} onClick={() => onSelect(null)}><X className="size-4" /></Button>}</div>
      {fieldError && <p id={`${clientFieldId}-error`} role="alert" className="text-xs text-destructive">{fieldError}</p>}
    </div>
    <Button type="button" variant="link" disabled={disabled || !canCreate} onClick={() => { setEditing(null); setDrawer(true); }}>Add Client</Button>
  </div>
    {resource.loading && <Loading label="Loading clients..." />}
    {resource.error && <Notice error={resource.error} retry={resource.reload} title="Client list unavailable" />}
    {!disabled && !resource.loading && !resource.error && resource.data?.nodes.length === 0 && <p className="text-sm text-muted-foreground">No clients available.</p>}
    {selected && <div className="opp-client-summary"><div className="flex flex-wrap justify-between gap-2"><strong>{selected.name}</strong>{(canUpdate || selected.allowedActions.includes('CLIENT_UPDATE')) && <Button type="button" variant="link" disabled={disabled} onClick={() => { setEditing(selected); setDrawer(true); }}>Edit Client</Button>}</div><p className="mt-1 break-words text-xs text-muted-foreground">{selected.primaryContact.name} · {selected.primaryContact.email}</p><details key={selected.id} className="opp-client-details" open><summary>Client details & contacts</summary><ClientValues client={selected} /></details></div>}
    <ClientDrawer client={editing} open={drawer} setOpen={setDrawer} lookups={lookups} canCreate={canCreate} canUpdate={canUpdate} onSaved={client => { onSelect(client); resource.reload(); }} />
  </div>;
}
export function ClientValues({ client: c }: { client: OpportunityClient }) { return <><Values values={[
  ['Client name', c.name], ['Account type', c.accountTypeName], ['Sector / industry', c.industryName], ['Website', c.website], ['Street address', c.streetAddress], ['Country', c.country], ['State / province', c.stateProvince], ['City', c.city], ['Primary contact', c.primaryContact.name], ['Title / role', c.primaryContact.title], ['Email', c.primaryContact.email], ['Phone', c.primaryContact.phone], ['Role in decision', c.primaryContact.decisionRole === 'Other' ? c.primaryContact.decisionRoleOther : c.primaryContact.decisionRole],
]} />{c.additionalContacts.map((contact, i) => <div key={contact.id ?? i} className="mt-3 border-t pt-3"><h4 className="mb-2 text-sm font-semibold">Additional contact {i + 1}</h4><Values values={[
  ['Full name', contact.name], ['Title / role', contact.title], ['Email', contact.email], ['Phone', contact.phone], ['Role in decision', contact.decisionRole],
]} /></div>)}</>; }
