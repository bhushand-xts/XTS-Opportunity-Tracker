import type { EstimationVersion } from '@xts/api-contracts';
import type { ReactNode } from 'react';
import { Badge, Button, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@xts/design-system';
import { CalendarClock, CircleDollarSign, Clock3, Coins, UserRound } from 'lucide-react';
import { money } from '../lib/workflow';
import { SavedEstimationBreakdown } from './SavedEstimationBreakdown';

const MetaItem = ({ icon: Icon, label, children }: { icon: typeof CalendarClock; label: string; children: ReactNode }) => <div className="flex min-w-0 items-center gap-2">
  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/70"><Icon className="size-3.5" aria-hidden="true" /></span>
  <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-0.5 truncate text-xs font-medium text-foreground" title={typeof children === 'string' ? children : undefined}>{children}</div></div>
</div>;

export function EstimationVersionView({ version }: { version: EstimationVersion }) {
  const creator = version.createdByName?.trim() || `User ${version.createdBy}`;
  return <>
    <DialogHeader className="border-b pb-2 pr-8 text-left">
      <div className="flex flex-wrap items-center gap-1.5">
        <DialogTitle className="mr-1 text-lg font-semibold tracking-tight">{version.name}</DialogTitle>
        <Badge variant="muted" className="rounded-full px-2 py-0.5 text-[10px]">Version {version.version}</Badge>
        <Badge variant="muted" className={`rounded-full px-2 py-0.5 text-[10px] ${version.status === 'SUBMITTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
          <span className={`mr-1 size-1.5 rounded-full ${version.status === 'SUBMITTED' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
          {version.status === 'SUBMITTED' ? 'Submitted' : 'Saved'}
        </Badge>
      </div>
      <DialogDescription className="sr-only">Read-only details for saved estimation {version.name}.</DialogDescription>
      <div className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1 rounded-lg border bg-muted/25 px-2.5 py-1.5 sm:grid-cols-2">
        <MetaItem icon={CalendarClock} label="Saved on">{new Date(version.createdAt).toLocaleString()}</MetaItem>
        <MetaItem icon={UserRound} label="Created by"><span className="text-primary">{creator}</span></MetaItem>
      </div>
    </DialogHeader>

    <div className="min-h-0 space-y-3 overflow-y-auto px-0.5 py-0 pr-1">
      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background px-3 py-2">
          <CircleDollarSign className="absolute right-2 top-2 size-3.5 text-primary/35" aria-hidden="true" />
          <dt className="text-[11px] font-medium text-muted-foreground">Total cost</dt>
          <dd className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums text-foreground">{money(version.estimation.total, version.currencyCode)}</dd>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="mb-0.5 flex items-center gap-1.5"><Clock3 className="size-3.5 text-teal-600" aria-hidden="true" /><dt className="text-[11px] font-medium text-muted-foreground">Total effort</dt></div>
          <dd className="text-lg font-semibold tracking-tight tabular-nums">{Number(version.personWeeks)} <span className="text-xs font-medium text-muted-foreground">person-weeks</span></dd>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="mb-0.5 flex items-center gap-1.5"><Coins className="size-3.5 text-amber-600" aria-hidden="true" /><dt className="text-[11px] font-medium text-muted-foreground">Currency</dt></div>
          <dd className="text-lg font-semibold tracking-tight">{version.currencyCode || 'Not specified'}</dd>
        </div>
      </dl>

      <SavedEstimationBreakdown estimation={version.estimation} />
      {version.estimation.assumptions.trim() && <section className="rounded-lg border bg-muted/20 p-3">
        <h3 className="mb-2 text-sm font-semibold">Saved assumptions</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{version.estimation.assumptions}</p>
      </section>}
    </div>

    <DialogFooter className="border-t pt-2">
      <DialogClose asChild><Button type="button" variant="outline" size="sm" className="min-w-20 border-slate-300 bg-white font-medium text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Close</Button></DialogClose>
    </DialogFooter>
  </>;
}
