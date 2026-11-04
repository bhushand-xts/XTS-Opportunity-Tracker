import type { EstimationVersion } from '@xts/api-contracts';
import { Badge, Button, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import { money, rowAmount } from '../lib/workflow';

/** Historical names come from saved rows, never from today's masters. */
function savedLabels(version: EstimationVersion) {
  const phases = new Map<number, string>(), roles = new Map<string, string>();
  const grid = version.estimation.grid;
  for (const phaseId of grid?.phaseIds ?? []) for (const code of grid?.roleCodes ?? []) {
    const row = version.estimation.rows.find(item => item.id === `grid-${phaseId}-${code}`);
    const parts = row?.workItem.split(' — ');
    if (parts && parts.length === 2) { phases.set(phaseId, parts[0]); roles.set(code, parts[1]); }
  }
  return { phases, roles };
}

export function EstimationVersionView({ version }: { version: EstimationVersion }) {
  const grid = version.estimation.grid;
  const labels = savedLabels(version);
  const tableStyle = 'min-w-[500px] [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0 [&_th]:bg-muted/60 [&_th]:text-xs [&_td]:text-sm';
  return <>
    <DialogHeader className="pr-6"><div className="flex flex-wrap items-center gap-2"><DialogTitle>{version.name}</DialogTitle><Badge variant="muted">V{version.version}</Badge><Badge variant="muted">{version.status === 'SUBMITTED' ? 'Submitted' : 'Saved'}</Badge></div><DialogDescription>Saved {new Date(version.createdAt).toLocaleString()} · User {version.createdBy}. Historical values are read-only.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-primary/5 p-3"><dt className="text-xs text-muted-foreground">Total cost</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(version.estimation.total, version.currencyCode)}</dd></div>
        <div className="rounded-lg border bg-muted/30 p-3"><dt className="text-xs text-muted-foreground">Total effort</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{Number(version.personWeeks)} <span className="text-xs font-normal text-muted-foreground">person-weeks</span></dd></div>
        <div className="rounded-lg border bg-muted/30 p-3"><dt className="text-xs text-muted-foreground">Currency</dt><dd className="mt-1 text-lg font-semibold">{version.currencyCode || 'Not specified'}</dd></div>
      </dl>
      {grid && <section aria-label="Saved resource allocation"><h3 className="mb-2 text-sm font-semibold">Resource allocation</h3><div className="overflow-x-auto rounded-lg border"><Table className={tableStyle}><TableHeader><TableRow><TableHead>Phase</TableHead><TableHead className="text-center">Duration (weeks)</TableHead>{grid.roleCodes.map(code => <TableHead key={code} className="text-center">{labels.roles.get(code) ?? code}</TableHead>)}</TableRow></TableHeader><TableBody>{grid.phaseIds.map(phaseId => <TableRow key={phaseId}><TableCell className="font-medium">{labels.phases.get(phaseId) ?? `Phase ${phaseId}`}</TableCell><TableCell className="text-center tabular-nums">{grid.durations.find(item => item.phaseId === phaseId)?.weeks}</TableCell>{grid.roleCodes.map(code => <TableCell key={code} className="text-center tabular-nums">{grid.allocations.find(item => item.phaseId === phaseId && item.roleCode === code)?.effort}</TableCell>)}</TableRow>)}</TableBody></Table></div><p className="mt-1.5 text-xs text-muted-foreground">Role values show resource allocation. All values are from this saved version.</p></section>}
      <section aria-label="Saved cost breakdown"><h3 className="mb-2 text-sm font-semibold">Cost breakdown</h3><div className="overflow-x-auto rounded-lg border"><Table className={tableStyle}><TableHeader><TableRow><TableHead>Work item</TableHead><TableHead className="text-right">Hours</TableHead><TableHead className="text-right">People</TableHead><TableHead className="text-right">Hourly rate</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader><TableBody>{version.estimation.rows.map(row => <TableRow key={row.id}><TableCell>{row.workItem}</TableCell><TableCell className="text-right tabular-nums">{Number(row.hours)}</TableCell><TableCell className="text-right tabular-nums">{row.people}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{money(row.hourlyRate, version.currencyCode)}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{money(rowAmount(row, version.estimation), version.currencyCode)}</TableCell></TableRow>)}<TableRow className="bg-muted/40 font-semibold"><TableCell colSpan={4}>Total</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{money(version.estimation.total, version.currencyCode)}</TableCell></TableRow></TableBody></Table></div></section>
      {version.estimation.assumptions.trim() && <section><h3 className="mb-2 text-sm font-semibold">Saved assumptions</h3><p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm">{version.estimation.assumptions}</p></section>}
    </div>
    <DialogFooter className="border-t pt-3"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
  </>;
}
