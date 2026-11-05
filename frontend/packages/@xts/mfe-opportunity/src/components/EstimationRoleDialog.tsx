import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useAuth } from '@xts/design-system';
import type { Currency, EstimationPhase, RateMaster, RateMasterInput } from '@xts/api-contracts';
import { CREATE_ESTIMATION_ROLE, GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';

type Masters = { estimationPhasesList: (EstimationPhase | null)[]; rateMasters: (RateMaster | null)[]; currencies: (Currency | null)[] };

export function EstimationRoleDialog({ open, onOpenChange, currencies, roles, defaultCurrencyId, onCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; currencies: Currency[]; roles: (RateMaster | null)[];
  defaultCurrencyId?: number; onCreated: (role: RateMaster) => void;
}) {
  const auth = useAuth();
  const [name, setName] = useState(''), [code, setCode] = useState('');
  const [currencyId, setCurrencyId] = useState(defaultCurrencyId ? String(defaultCurrencyId) : '');
  const [rate, setRate] = useState(''), [error, setError] = useState<string>();
  const [createRole, { loading }] = useMutation<{ createRateMaster: RateMaster }, { input: RateMasterInput }>(CREATE_ESTIMATION_ROLE, {
    update(cache, { data }) {
      if (!data?.createRateMaster) return;
      const created = data.createRateMaster;
      cache.updateQuery<Masters>({ query: GET_ESTIMATION_MASTERS }, current => current ? {
        ...current, rateMasters: [...current.rateMasters.filter(role => role?.ratemasterId !== created.ratemasterId), created],
      } : current);
    },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(undefined);
    if (!auth.hasPermission('technical_roles_and_rate_master', 'add')) { setError('You do not have permission to add technical roles.'); return; }
    const roleName = name.trim(), roleCode = code.trim(), defaultRate = Number(rate);
    if (!roleName || !roleCode || !currencies.some(currency => String(currency.currencyId) === currencyId) || !rate.trim() || !Number.isFinite(defaultRate) || defaultRate <= 0) {
      setError('Enter a role name, unique code, currency, and a monthly rate greater than zero.'); return;
    }
    if (roles.some(role => role && (role.roleCode.toLowerCase() === roleCode.toLowerCase() || role.roleName.toLowerCase() === roleName.toLowerCase()))) {
      setError('A technical role with this name or code already exists.'); return;
    }
    const createdBy = Number(auth.session?.userId);
    if (!Number.isSafeInteger(createdBy) || createdBy <= 0) { setError('Please sign in again before adding a technical role.'); return; }
    try {
      const { data } = await createRole({ variables: { input: { roleName, roleCode, currencyId: Number(currencyId), rateType: 'Monthly', defaultRate, createdBy } } });
      if (!data?.createRateMaster) throw new Error('The technical role could not be created. Please retry.');
      onCreated(data.createRateMaster);
      onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add the technical role. Please retry.'); }
  }

  return <Dialog open={open} onOpenChange={value => { if (!loading) onOpenChange(value); }}>
    <DialogContent className="opp-dialog sm:max-w-lg">
      <DialogHeader><DialogTitle>Add technical role</DialogTitle><DialogDescription>Create a shared technical role with a monthly rate. It will be selected in this estimate and available in Administration.</DialogDescription></DialogHeader>
      <form onSubmit={event => void submit(event)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="estimate-role-name">Role name</Label><Input id="estimate-role-name" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. QA Engineer" required disabled={loading} /></div>
          <div className="space-y-1"><Label htmlFor="estimate-role-code">Role code</Label><Input id="estimate-role-code" value={code} onChange={event => setCode(event.target.value)} placeholder="e.g. QA_ENG" required disabled={loading} /></div>
          <div className="space-y-1"><Label htmlFor="estimate-role-currency">Currency</Label><Select value={currencyId} onValueChange={setCurrencyId} disabled={loading}><SelectTrigger id="estimate-role-currency" aria-label="Role currency"><SelectValue placeholder="Select currency" /></SelectTrigger><SelectContent>{currencies.map(currency => <SelectItem key={currency.currencyId} value={String(currency.currencyId)}>{currency.currencyCode}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label htmlFor="estimate-role-rate">Monthly rate</Label><Input id="estimate-role-rate" type="number" min="0.01" step="0.01" value={rate} onChange={event => setRate(event.target.value)} required disabled={loading} /></div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add role'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
