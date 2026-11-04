import type { OpportunityEstimation } from '../repositories/opportunity.repository';

export const ESTIMATION_CURRENCY_CODE = 'USD';
const scaled = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
};
const quantity = (value: bigint) => `${value / 100000000n}.${String(value % 100000000n).padStart(8, '0')}`.replace(/\.?0+$/, '');
const money = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;

export function estimationRates(estimate: OpportunityEstimation): NonNullable<OpportunityEstimation['rates']> {
  if (estimate.rates) return estimate.rates;
  // Older estimates stored an hourly rate per matrix cell. Read these without
  // consulting today's master or changing the historical price.
  return (estimate.grid?.roleCodes ?? []).flatMap(roleCode => {
    const row = estimate.rows.find(row => estimate.grid!.phaseIds.some(id => row.id === `grid-${id}-${roleCode}`));
    return row ? [{ roleCode, rate: (Number(row.hourlyRate) * 160).toFixed(4), rateType: 'Monthly', currencyCode: ESTIMATION_CURRENCY_CODE }] : [];
  });
}

export function applyEstimationRates(estimate: OpportunityEstimation): OpportunityEstimation {
  if (!estimate.rates) return estimate;
  return { ...estimate, rows: estimate.rows.map(row => {
    const rate = estimate.rates!.find(rate => estimate.grid?.phaseIds.some(id => row.id === `grid-${id}-${rate.roleCode}`));
    return rate ? { ...row, hourlyRate: (Number(rate.rate) / (rate.rateType.toLowerCase() === 'monthly' ? 160 : 40)).toFixed(4) } : row;
  }) };
}

export function estimationPayload(estimate: OpportunityEstimation) {
  estimate = applyEstimationRates(estimate);
  let totalEffort = 0n, totalCost = 0n;
  const efforts: { id: string; personWeeks: string }[] = [];
  const costs: { id: string; cost: string }[] = [];
  for (const row of estimate.rows) {
    const role = estimate.rates?.find(rate => estimate.grid?.phaseIds.some(id => row.id === `grid-${id}-${rate.roleCode}`));
    const phaseId = role && estimate.grid?.phaseIds.find(id => row.id === `grid-${id}-${role.roleCode}`);
    const duration = estimate.grid?.durations.find(item => item.phaseId === phaseId)?.weeks;
    const allocation = estimate.grid?.allocations.find(item => item.phaseId === phaseId && item.roleCode === role?.roleCode)?.effort;
    const effort = role && duration?.trim() && allocation?.trim()
      ? scaled(duration) * scaled(allocation)
      : scaled(row.hours) * BigInt(row.people) * 250n;
    // (Monthly rate / 20) * (Person-weeks * 5). Keep the full billing
    // rate and effort precision; round only the final cell to USD cents.
    const divisor = role?.rateType.trim().toLowerCase() === 'monthly' ? 40000000000n : 10000000000n;
    const cost = role ? (scaled(role.rate) * effort + divisor / 2n) / divisor
      : (scaled(row.hours) * scaled(row.hourlyRate) * BigInt(row.people) + 500000n) / 1000000n;
    totalEffort += effort; totalCost += cost;
    efforts.push({ id: row.id, personWeeks: quantity(effort) });
    costs.push({ id: row.id, cost: money(cost) });
  }
  return {
    allocation: { schemaVersion: 1, status: estimate.status ?? 'DRAFT', assumptions: estimate.assumptions, grid: estimate.grid ?? null,
      rows: estimate.rows.map(({ hourlyRate: _rate, ...row }) => row) },
    rates: {
      roles: Object.fromEntries(estimationRates(estimate).map(({ roleCode, ...rate }) => [roleCode, rate])),
      // Keep rates for old free-form work items that have no technical role.
      legacyRows: estimate.rows.filter(row => !estimate.grid?.roleCodes.some(code => estimate.grid!.phaseIds.some(id => row.id === `grid-${id}-${code}`))).map(({ id, hourlyRate }) => ({ id, hourlyRate })),
    },
    effort: { total: quantity(totalEffort), rows: efforts },
    cost: { total: money(totalCost), currencyCode: ESTIMATION_CURRENCY_CODE, rows: costs },
  };
}

export function restoreEstimation(record: {
  revision: number;
  resource_allocation: ReturnType<typeof estimationPayload>['allocation'];
  rate_snapshot: Partial<ReturnType<typeof estimationPayload>['rates']> & { rows?: { id: string; hourlyRate: string }[] };
  person_weeks_cost: ReturnType<typeof estimationPayload>['cost'];
}): OpportunityEstimation {
  const allocation = record.resource_allocation;
  const rates = new Map((record.rate_snapshot.rows ?? record.rate_snapshot.legacyRows ?? []).map(row => [row.id, row.hourlyRate]));
  const estimate: OpportunityEstimation = { revision: record.revision, status: allocation.status, grid: allocation.grid,
    ...(record.rate_snapshot.roles && Object.keys(record.rate_snapshot.roles).length ? { rates: Object.entries(record.rate_snapshot.roles).map(([roleCode, rate]) => ({ roleCode, ...rate })) } : {}),
    rows: allocation.rows.map(row => ({ ...row, hourlyRate: rates.get(row.id)! })),
    assumptions: allocation.assumptions ?? '', total: record.person_weeks_cost.total };
  return applyEstimationRates(estimate);
}
