import type { Estimation } from '@xts/api-contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import { money, rowAmount } from '../lib/workflow';

type Values = { effort: number; cost: bigint | null };
const emptyValues = (): Values => ({ effort: 0, cost: 0n });
function add(left: Values, right: Values): Values {
  return { effort: left.effort + right.effort, cost: left.cost === null || right.cost === null ? null : left.cost + right.cost };
}
const quantity = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
function cost(value: bigint | null) {
  return value === null ? 'Unavailable' : money(`${value / 100n}.${String(value % 100n).padStart(2, '0')}`, 'USD');
}

/** Read-only phase tables shared by saved estimates and the overview drawer.
 * Names, allocations and billing rates come entirely from the saved snapshot. */
export function SavedEstimationBreakdown({ estimation }: { estimation: Estimation }) {
  const grid = estimation.grid;
  const phaseIds = grid?.phaseIds ?? [], roleCodes = grid?.roleCodes ?? [];
  const phases = new Map<number, string>(), roleNames = new Map<string, string>();
  const rows = new Map(estimation.rows.map(row => [row.id, row]));
  const gridIds = new Set<string>();
  const allocation = (phaseId: number, roleCode: string) => grid?.allocations.find(item => item.phaseId === phaseId && item.roleCode === roleCode)?.effort ?? '0';
  const duration = (phaseId: number) => grid?.durations.find(item => item.phaseId === phaseId)?.weeks ?? '0';
  for (const phaseId of phaseIds) for (const roleCode of roleCodes) {
    const id = `grid-${phaseId}-${roleCode}`;
    gridIds.add(id);
    const name = rows.get(id)?.workItem;
    const separator = name?.lastIndexOf(' — ') ?? -1;
    if (name && separator >= 0) {
      phases.set(phaseId, name.slice(0, separator));
      roleNames.set(roleCode, name.slice(separator + 3));
    }
  }
  function rowCost(row: Estimation['rows'][number]): bigint | null {
    try { return BigInt(rowAmount(row, estimation).replace('.', '')); }
    catch { return null; }
  }
  const phaseRows = phaseIds.map(phaseId => {
    const cells = roleCodes.map(roleCode => {
      const row = rows.get(`grid-${phaseId}-${roleCode}`);
      return { effort: Number(duration(phaseId)) * Number(allocation(phaseId, roleCode)), cost: row ? rowCost(row) : 0n };
    });
    return { phaseId, name: phases.get(phaseId) ?? `Phase ${phaseId}`, cells, total: cells.reduce(add, emptyValues()) };
  });
  // Retain older free-form items without presenting hourly rates or losing their cost.
  const otherRows = estimation.rows.filter(row => !gridIds.has(row.id)).map(row => ({
    row, values: { effort: Number(row.hours) * row.people / 40, cost: rowCost(row) },
  }));
  const roleTotals = roleCodes.map((_, index) => phaseRows.reduce((sum, phase) => add(sum, phase.cells[index]), emptyValues()));
  const total = [...phaseRows.map(phase => phase.total), ...otherRows.map(item => item.values)].reduce(add, emptyValues());
  const tableStyle = 'min-w-full [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0 [&_th]:whitespace-nowrap [&_th]:text-xs [&_td]:text-sm';
  const roleHeaders = roleCodes.map(code => <TableHead key={code} scope="col" className="text-right" title={roleNames.get(code)}>{code}</TableHead>);
  return <div className="space-y-5">
    <section aria-label="Resource allocation">
      <h3 className="mb-2 text-sm font-semibold">Resource allocation</h3>
      {phaseRows.length > 0 && <div className="overflow-x-auto rounded-lg border" tabIndex={0}>
        <Table aria-label="Resource allocation" className={tableStyle}>
          <TableHeader className="bg-indigo-50/70 dark:bg-indigo-950/30"><TableRow><TableHead scope="col">Phase</TableHead><TableHead scope="col" className="text-right">Duration in weeks</TableHead>{roleHeaders}</TableRow></TableHeader>
          <TableBody>{phaseRows.map(phase => <TableRow key={phase.phaseId}>
            <TableCell className="font-medium">{phase.name}</TableCell><TableCell className="text-right tabular-nums">{duration(phase.phaseId)}</TableCell>
            {roleCodes.map(code => <TableCell key={code} className="text-right tabular-nums">{allocation(phase.phaseId, code)}</TableCell>)}
          </TableRow>)}</TableBody>
        </Table>
      </div>}
      {otherRows.length > 0 && <div className="mt-2 overflow-x-auto rounded-lg border" tabIndex={0}>
        <Table aria-label="Additional resource allocation" className={tableStyle}>
          <TableHeader className="bg-indigo-50/70 dark:bg-indigo-950/30"><TableRow><TableHead scope="col">Work item</TableHead><TableHead scope="col" className="text-right">Duration in weeks</TableHead><TableHead scope="col" className="text-right">Resource allocation</TableHead></TableRow></TableHeader>
          <TableBody>{otherRows.map(({ row }) => <TableRow key={row.id}><TableCell>{row.workItem}</TableCell><TableCell className="text-right tabular-nums">{quantity(Number(row.hours) / 40)}</TableCell><TableCell className="text-right tabular-nums">{row.people}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>}
      {!phaseRows.length && !otherRows.length && <p className="text-sm text-muted-foreground">No saved allocation.</p>}
    </section>
    {(['effort', 'cost'] as const).map(metric => {
      const title = metric === 'effort' ? 'Person-weeks' : 'Cost (USD)';
      const format = (values: Values) => metric === 'effort' ? quantity(values.effort) : cost(values.cost);
      return <section key={metric} aria-label={title}>
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <div className="overflow-x-auto rounded-lg border" tabIndex={0}>
          <Table aria-label={title} className={tableStyle}>
            <TableHeader className={metric === 'effort' ? 'bg-teal-50/70 dark:bg-teal-950/30' : 'bg-amber-50/70 dark:bg-amber-950/30'}><TableRow><TableHead scope="col">{phaseRows.length ? 'Phase' : 'Work item'}</TableHead>{roleHeaders}<TableHead scope="col" className="text-right">{metric === 'effort' ? 'Total effort' : 'Total cost'}</TableHead></TableRow></TableHeader>
            <TableBody>
              {phaseRows.map(phase => <TableRow key={phase.phaseId}><TableCell className="font-medium">{phase.name}</TableCell>{phase.cells.map((cell, index) => <TableCell key={roleCodes[index]} className="whitespace-nowrap text-right tabular-nums">{format(cell)}</TableCell>)}<TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{format(phase.total)}</TableCell></TableRow>)}
              {otherRows.map(({ row, values }) => <TableRow key={row.id}><TableCell>{row.workItem}</TableCell>{roleCodes.length > 0 && <TableCell colSpan={roleCodes.length} className="text-center">—</TableCell>}<TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{format(values)}</TableCell></TableRow>)}
              <TableRow className="bg-muted/40 font-semibold"><TableCell>Total</TableCell>{roleTotals.map((values, index) => <TableCell key={roleCodes[index]} className="whitespace-nowrap text-right tabular-nums">{format(values)}</TableCell>)}<TableCell className="whitespace-nowrap text-right tabular-nums">{format(total)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </section>;
    })}
  </div>;
}
