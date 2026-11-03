import { useState } from 'react';
import { ChevronDown, LockKeyhole, Wallet, X } from 'lucide-react';
import type { Currency, RateMaster } from '@xts/api-contracts';
import { Badge, Button, Popover, PopoverContent, PopoverTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';

export function EstimationRateMaster({ roles, currencies, currencyCode }: { roles: RateMaster[]; currencies: Currency[]; currencyCode: string }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" className="gap-2 bg-background"><Wallet className="size-4" aria-hidden="true" />Rate master<ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-lg border-t-[3px] border-t-indigo-500 p-0">
      <div className="flex items-start gap-3 border-b bg-indigo-50/70 px-4 py-3 dark:bg-indigo-950/30">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wallet className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Rate master <span className="ml-1 text-xs font-normal text-muted-foreground">{roles.length} active {roles.length === 1 ? 'role' : 'roles'}</span></h3><p className="mt-1 text-xs text-muted-foreground">Reference rates for active technical roles.</p></div>
        <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" aria-label="Close rate master" onClick={() => setOpen(false)}><X className="size-4" aria-hidden="true" /></Button>
      </div>
      <div className="max-h-[min(55vh,360px)] overflow-auto">
        <Table className="min-w-[440px]"><TableHeader className="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-950"><TableRow><TableHead className="pl-4 text-xs">Technical role</TableHead><TableHead className="text-xs">Currency</TableHead><TableHead className="text-right text-xs">Rate</TableHead><TableHead className="pr-4 text-right text-xs">Billing period</TableHead></TableRow></TableHeader>
          <TableBody>{roles.map(role => <TableRow key={role.roleCode}>
            <TableCell className="py-3 pl-4 text-sm font-medium">{role.roleName}</TableCell>
            <TableCell><Badge variant="muted" className="border-sky-200 bg-sky-50 font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">{currencies.find(currency => currency.currencyId === role.currencyId)?.currencyCode ?? currencyCode}</Badge></TableCell>
            <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">{Number(role.defaultRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell className="pr-4 text-right"><span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{role.rateType}</span></TableCell>
          </TableRow>)}{!roles.length && <TableRow><TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No active rates configured.</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" /><span>Read-only. Rates are maintained in Administration.</span></div>
    </PopoverContent>
  </Popover>;
}
