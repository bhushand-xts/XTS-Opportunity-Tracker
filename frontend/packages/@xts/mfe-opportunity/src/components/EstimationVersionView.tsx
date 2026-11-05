import type { EstimationVersion } from '@xts/api-contracts';
import { Badge, Button, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@xts/design-system';
import { money } from '../lib/workflow';
import { SavedEstimationBreakdown } from './SavedEstimationBreakdown';

export function EstimationVersionView({ version }: { version: EstimationVersion }) {
  return <>
    <DialogHeader className="pr-6"><div className="flex flex-wrap items-center gap-2"><DialogTitle>{version.name}</DialogTitle><Badge variant="muted">V{version.version}</Badge><Badge variant="muted">{version.status === 'SUBMITTED' ? 'Submitted' : 'Saved'}</Badge></div><DialogDescription>Saved {new Date(version.createdAt).toLocaleString()} · User {version.createdBy}. Historical values are read-only.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-primary/5 p-3"><dt className="text-xs text-muted-foreground">Total cost</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(version.estimation.total, version.currencyCode)}</dd></div>
        <div className="rounded-lg border bg-muted/30 p-3"><dt className="text-xs text-muted-foreground">Total effort</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{Number(version.personWeeks)} <span className="text-xs font-normal text-muted-foreground">person-weeks</span></dd></div>
        <div className="rounded-lg border bg-muted/30 p-3"><dt className="text-xs text-muted-foreground">Currency</dt><dd className="mt-1 text-lg font-semibold">{version.currencyCode || 'Not specified'}</dd></div>
      </dl>
      <SavedEstimationBreakdown estimation={version.estimation} />
      {version.estimation.assumptions.trim() && <section><h3 className="mb-2 text-sm font-semibold">Saved assumptions</h3><p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm">{version.estimation.assumptions}</p></section>}
    </div>
    <DialogFooter className="border-t pt-3"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
  </>;
}
