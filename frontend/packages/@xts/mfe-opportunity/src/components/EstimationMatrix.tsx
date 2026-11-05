import type { EstimationPhase, RateMaster } from '@xts/api-contracts';
import { Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import { money } from '../lib/workflow';

type Props = {
  phases: EstimationPhase[]; roles: RateMaster[]; editable: boolean; saving: boolean; validationId: string; currencyCode: string;
  duration: (phaseId: number) => string; allocation: (phaseId: number, roleCode: string) => string;
  onDuration: (phaseId: number, value: string) => void; onAllocation: (phaseId: number, roleCode: string, value: string) => void;
  durationError: (phaseId: number) => string | undefined; effortError: (phaseId: number, roleCode: string) => string | undefined;
  rateError: (role: RateMaster) => boolean;
  personWeek: (phaseId: number, roleCode: string) => number; cellCost: (phaseId: number, roleCode: string, role: RateMaster) => number;
  formatNumber: (value: number) => string; effortTotal: number; total: string; calculationError?: string;
};

/** Presentation only: all inputs, validation and calculations remain owned by EstimationModule. */
export function EstimationMatrix(p: Props) {
  if (!p.phases.length || !p.roles.length) return <p className="text-sm text-muted-foreground">Select at least one phase and one technical role above to build the grid.</p>;
  return <div className="opp-estimation-scroll opp-estimation-matrix" role="region" aria-label="Estimation matrix" tabIndex={0}>
    <Table aria-label="Phase-wise estimation: allocation, person-weeks and cost">
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2} scope="col" className="matrix-index">#</TableHead>
          <TableHead rowSpan={2} scope="col" className="matrix-phase">Phase</TableHead>
          <TableHead rowSpan={2} scope="col" className="matrix-duration">Duration in weeks</TableHead>
          <TableHead colSpan={p.roles.length} scope="colgroup" className="matrix-allocation">Resource allocation</TableHead>
          <TableHead colSpan={p.roles.length + 1} scope="colgroup" className="matrix-effort">Person-weeks</TableHead>
          <TableHead colSpan={p.roles.length + 1} scope="colgroup" className="matrix-cost">Cost ({p.currencyCode})</TableHead>
        </TableRow>
        <TableRow>
          {p.roles.map(role => <TableHead key={role.roleCode} scope="col" className="matrix-allocation" title={role.roleName}>{role.roleCode}{p.rateError(role) && <p role="alert" className="mt-1 text-xs font-normal text-destructive">Configure a positive rate.</p>}</TableHead>)}
          {p.roles.map(role => <TableHead key={role.roleCode} scope="col" className="matrix-effort" title={role.roleName}>{role.roleCode}</TableHead>)}
          <TableHead scope="col" className="matrix-effort matrix-total font-semibold">Total effort</TableHead>
          {p.roles.map(role => <TableHead key={role.roleCode} scope="col" className="matrix-cost" title={role.roleName}>{role.roleCode}</TableHead>)}
          <TableHead scope="col" className="matrix-cost matrix-total font-semibold">Total cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {p.phases.map((phase, index) => <TableRow key={phase.id}>
          <TableCell className="matrix-index text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="matrix-phase font-medium">{phase.phaseName}</TableCell>
          <TableCell className="matrix-duration">
            {p.editable ? <Input aria-label={`${phase.phaseName} duration in weeks`} aria-invalid={Boolean(p.durationError(phase.id))} aria-describedby={p.durationError(phase.id) ? `${p.validationId}-duration-${phase.id}` : undefined} type="number" min="0" step="0.5" value={p.duration(phase.id)} onChange={event => p.onDuration(phase.id, event.target.value)} disabled={p.saving} /> : p.duration(phase.id)}
            {p.editable && p.durationError(phase.id) && <p id={`${p.validationId}-duration-${phase.id}`} role="alert" className="mt-1 text-xs text-destructive">{p.durationError(phase.id)}</p>}
          </TableCell>
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-allocation">
            {p.editable ? <Input aria-label={`${phase.phaseName} — ${role.roleName} resource allocation`} aria-invalid={Boolean(p.effortError(phase.id, role.roleCode))} aria-describedby={p.effortError(phase.id, role.roleCode) ? `${p.validationId}-effort-${phase.id}-${role.roleCode}` : undefined} type="number" min="0" step="0.05" value={p.allocation(phase.id, role.roleCode)} onChange={event => p.onAllocation(phase.id, role.roleCode, event.target.value)} disabled={p.saving} /> : p.allocation(phase.id, role.roleCode)}
            {p.editable && p.effortError(phase.id, role.roleCode) && <p id={`${p.validationId}-effort-${phase.id}-${role.roleCode}`} role="alert" className="mt-1 text-xs text-destructive">{p.effortError(phase.id, role.roleCode)}</p>}
          </TableCell>)}
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-effort">{p.formatNumber(p.personWeek(phase.id, role.roleCode))}</TableCell>)}
          <TableCell className="matrix-effort matrix-total font-semibold">{p.formatNumber(p.roles.reduce((sum, role) => sum + p.personWeek(phase.id, role.roleCode), 0))}</TableCell>
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-cost whitespace-nowrap">{money(p.formatNumber(p.cellCost(phase.id, role.roleCode, role)), p.currencyCode)}</TableCell>)}
          <TableCell className="matrix-cost matrix-total whitespace-nowrap font-semibold">{money(p.formatNumber(p.roles.reduce((sum, role) => sum + p.cellCost(phase.id, role.roleCode, role), 0)), p.currencyCode)}</TableCell>
        </TableRow>)}
        <TableRow className="matrix-totals font-semibold">
          <TableCell className="matrix-index" />
          <TableCell className="matrix-phase">Total</TableCell>
          <TableCell className="matrix-duration" />
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-allocation">—</TableCell>)}
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-effort">{p.formatNumber(p.phases.reduce((sum, phase) => sum + p.personWeek(phase.id, role.roleCode), 0))}</TableCell>)}
          <TableCell className="matrix-effort matrix-total">{p.formatNumber(p.effortTotal)}</TableCell>
          {p.roles.map(role => <TableCell key={role.roleCode} className="matrix-cost whitespace-nowrap">{money(p.formatNumber(p.phases.reduce((sum, phase) => sum + p.cellCost(phase.id, role.roleCode, role), 0)), p.currencyCode)}</TableCell>)}
          <TableCell className="matrix-cost matrix-total whitespace-nowrap">{p.calculationError ? 'Check matrix values' : money(p.total, p.currencyCode)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>;
}
