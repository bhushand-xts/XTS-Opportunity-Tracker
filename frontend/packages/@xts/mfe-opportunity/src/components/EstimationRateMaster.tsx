import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LockKeyhole, Wallet, X } from 'lucide-react';
import type { Currency, RateMaster } from '@xts/api-contracts';
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';

function RateValue({ role, editable, onChange, onValidity }: { role: RateMaster; editable: boolean; onChange?: (code: string, value: string) => void; onValidity: (code: string, valid: boolean) => void }) {
  const [value, setValue] = useState(String(role.defaultRate));
  const [error, setError] = useState(false);
  useEffect(() => { setValue(String(role.defaultRate)); setError(false); }, [role.defaultRate]);
  function change(next: string) {
    setValue(next);
    const valid = /^\d{1,10}(\.\d{1,4})?$/.test(next) && Number(next) > 0;
    setError(!valid);
    onValidity(role.roleCode, valid);
    if (valid) onChange?.(role.roleCode, next);
  }
  return editable ? <div><Input type="number" step="0.0001" min="0.0001" aria-label={`Rate for ${role.roleCode}`} aria-invalid={error} value={value} onChange={event => change(event.target.value)} onKeyDown={event => {
    if (event.key === 'Enter') event.preventDefault();
  }} className="ml-auto w-36 text-right tabular-nums" />{error && <p role="alert" className="text-xs text-destructive">Enter a positive rate with up to four decimal places.</p>}</div> : <span>{Number(role.defaultRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>;
}

export function EstimationRateMaster({ roles, currencies, currencyCode, inline = false, editableRoleCodes, onRateChange, onValidationChange }: { roles: RateMaster[]; currencies: Currency[]; currencyCode: string; inline?: boolean; editableRoleCodes?: Set<string>; onRateChange?: (code: string, value: string) => void; onValidationChange?: (invalid: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const invalidRoles = useRef(new Set<string>());
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) { invalidRoles.current.clear(); onValidationChange?.(false); }
  }
  function validity(code: string, valid: boolean) {
    if (valid) invalidRoles.current.delete(code); else invalidRoles.current.add(code);
    onValidationChange?.(invalidRoles.current.size > 0);
  }
  const trigger = <Button type="button" variant="outline" aria-expanded={inline ? open : undefined} aria-controls={inline ? panelId : undefined} className="gap-2 bg-background" onClick={inline ? () => changeOpen(!open) : undefined}><Wallet className="size-4" aria-hidden="true" />Rate master<ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></Button>;
  const content = <>
      <div className="flex items-start gap-3 border-b bg-indigo-50/70 px-4 py-3 dark:bg-indigo-950/30">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wallet className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Rate master <span className="ml-1 text-xs font-normal text-muted-foreground">{roles.length} {roles.length === 1 ? 'role' : 'roles'}</span></h3>{(onRateChange || !inline) && <p className="mt-1 text-xs text-muted-foreground">{onRateChange ? 'Adjust rates for this estimate. Costs recalculate automatically.' : 'Reference rates for active technical roles.'}</p>}</div>
        <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" aria-label="Close rate master" onClick={() => changeOpen(false)}><X className="size-4" aria-hidden="true" /></Button>
      </div>
      <div className={inline ? 'max-h-[min(30vh,240px)] overflow-auto' : 'max-h-[min(55vh,360px)] overflow-auto'}>
        <Table className="min-w-[440px]"><TableHeader className="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-950"><TableRow><TableHead className="pl-4 text-xs">Technical role</TableHead><TableHead className="text-xs">Currency</TableHead><TableHead className="text-right text-xs">Rate</TableHead><TableHead className="pr-4 text-right text-xs">Billing period</TableHead></TableRow></TableHeader>
          <TableBody>{roles.map(role => <TableRow key={role.roleCode}>
            <TableCell className="py-3 pl-4 text-sm font-medium" title={role.roleName}>{role.roleCode}</TableCell>
            <TableCell><Badge variant="muted" className="border-sky-200 bg-sky-50 font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">{currencies.find(currency => currency.currencyId === role.currencyId)?.currencyCode ?? currencyCode}</Badge></TableCell>
            <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums"><RateValue role={role} editable={Boolean(editableRoleCodes?.has(role.roleCode))} onChange={onRateChange} onValidity={validity} /></TableCell>
            <TableCell className="pr-4 text-right"><span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{role.rateType}</span></TableCell>
          </TableRow>)}{!roles.length && <TableRow><TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No active rates configured.</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      {onRateChange && <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" /><span>Choose Update estimate to save these rates for this opportunity.</span></div>}
  </>;
  if (inline) return <div className="col-span-full min-w-0 space-y-3">{trigger}{open && <section id={panelId} aria-label="Rate master" className="overflow-hidden rounded-lg border border-t-[3px] border-t-indigo-500 bg-card">{content}</section>}</div>;
  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent align="end" aria-label="Rate master" className="w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-lg border-t-[3px] border-t-indigo-500 p-0">{content}</PopoverContent>
  </Popover>;
}
