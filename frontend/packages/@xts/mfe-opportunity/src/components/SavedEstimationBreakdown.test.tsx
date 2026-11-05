import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Estimation } from '@xts/api-contracts';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';
import { SavedEstimationBreakdown } from './SavedEstimationBreakdown';

afterEach(cleanup);

const saved: Estimation = {
  revision: 1, assumptions: 'Keep this stored, but hide it in the overview.', total: '2100.00',
  grid: { phaseIds: [1, 2], roleCodes: ['PM', 'QA'], durations: [{ phaseId: 1, weeks: '2' }, { phaseId: 2, weeks: '1' }],
    allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.25' }, { phaseId: 1, roleCode: 'QA', effort: '1' },
      { phaseId: 2, roleCode: 'PM', effort: '1' }, { phaseId: 2, roleCode: 'QA', effort: '0' }] },
  rates: [{ roleCode: 'PM', rate: '4000', rateType: 'Monthly', currencyCode: 'USD' }, { roleCode: 'QA', rate: '1200', rateType: 'Monthly', currencyCode: 'USD' }],
  // Deliberately different hourly rates: phase costs must use the saved billing rates.
  rows: [{ id: 'grid-1-PM', workItem: 'Design — Project Manager', hours: '20', people: 1, hourlyRate: '999' },
    { id: 'grid-1-QA', workItem: 'Design — Quality Assurance', hours: '80', people: 1, hourlyRate: '999' },
    { id: 'grid-2-PM', workItem: 'Build — Project Manager', hours: '40', people: 1, hourlyRate: '999' }],
};

function rowValues(table: string, name: RegExp) {
  return within(within(screen.getByRole('table', { name: table })).getByRole('row', { name })).getAllByRole('cell').map(cell => cell.textContent);
}

it('shows allocation, person-weeks and USD phase costs with fractional allocations and matching totals', () => {
  const original = JSON.stringify(saved);
  render(<SavedEstimationBreakdown estimation={saved} />);
  expect(screen.getAllByRole('heading').map(heading => heading.textContent)).toEqual(['Resource allocation', 'Person-weeks', 'Cost (USD)']);
  expect(screen.queryByRole('columnheader', { name: /Hours|People|Hourly rate|Rate \/ hr/i })).not.toBeInTheDocument();
  expect(rowValues('Resource allocation', /^Design/)).toEqual(['Design', '2', '0.25', '1']);
  expect(rowValues('Person-weeks', /^Design/)).toEqual(['Design', '0.5', '2', '2.5']);
  expect(rowValues('Person-weeks', /^Build/)).toEqual(['Build', '1', '0', '1']);
  expect(rowValues('Person-weeks', /^Total /)).toEqual(['Total', '1.5', '2', '3.5']);
  expect(rowValues('Cost (USD)', /^Design/)).toEqual(['Design', '$500.00', '$600.00', '$1,100.00']);
  expect(rowValues('Cost (USD)', /^Build/)).toEqual(['Build', '$1,000.00', '$0.00', '$1,000.00']);
  expect(rowValues('Cost (USD)', /^Total /)).toEqual(['Total', '$1,500.00', '$600.00', '$2,100.00']);
  expect(JSON.stringify(saved)).toBe(original);
});

it('keeps exact monthly-rate precision instead of calculating from the rounded hourly rate', () => {
  const estimate: Estimation = { ...saved, total: '172732.52',
    grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] },
    rates: [{ roleCode: 'PM', rate: '345465.03', rateType: 'Monthly', currencyCode: 'USD' }],
    rows: [{ ...saved.rows[0], hours: '80', hourlyRate: '2159.1564' }] };
  render(<SavedEstimationBreakdown estimation={estimate} />);
  expect(rowValues('Cost (USD)', /^Design/)).toEqual(['Design', '$1,72,732.52', '$1,72,732.52']);
});

it.each([true, false])('retains older free-form costs and effort without hourly columns (with grid: %s)', withGrid => {
  const legacy = { id: 'old-item', workItem: 'Legacy work', hours: '25', people: 2, hourlyRate: '10' };
  const estimate: Estimation = withGrid ? { ...saved, rows: [...saved.rows, legacy], total: '2600.00' }
    : { revision: 1, rows: [legacy], total: '500.00', assumptions: '' };
  render(<SavedEstimationBreakdown estimation={estimate} />);
  expect(rowValues('Person-weeks', /^Legacy work/).at(-1)).toBe('1.25');
  expect(rowValues('Cost (USD)', /^Legacy work/).at(-1)).toBe('$500.00');
  expect(rowValues('Cost (USD)', /^Total /).at(-1)).toBe(withGrid ? '$2,600.00' : '$500.00');
  expect(screen.queryByRole('columnheader', { name: /Hours|Hourly rate/i })).not.toBeInTheDocument();
});

it('uses the same phase tables in the overview and hides assumptions while keeping estimate costs in USD', async () => {
  const opportunity = fixtureOpportunity({ stageId: 5, subStageId: 10, currencyCode: 'INR', estimation: saved,
    allowedActions: [], visibleModules: ['overview', 'estimation'] });
  const detail = vi.fn(async () => opportunity);
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, detail }}>
    <OpportunityAccessContext.Provider value={{ view: true, add: false, edit: false, approvals: false, work: false }}>
      <MemoryRouter initialEntries={['/opportunity/401/details']}><Routes><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage />} /></Routes></MemoryRouter>
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider>);
  fireEvent.click(await screen.findByRole('button', { name: /View estimate/ }));
  const drawer = within(await screen.findByRole('dialog', { name: 'Estimation matrix' }));
  expect(drawer.getAllByRole('table').map(table => table.getAttribute('aria-label'))).toEqual(['Resource allocation', 'Person-weeks', 'Cost (USD)']);
  expect(drawer.queryByRole('heading', { name: /Assumptions/i })).not.toBeInTheDocument();
  expect(drawer.queryByText(saved.assumptions)).not.toBeInTheDocument();
  expect(drawer.queryByRole('columnheader', { name: /Hours|Hourly rate|Rate \/ hr/i })).not.toBeInTheDocument();
  expect(drawer.getAllByText('$2,100.00').length).toBeGreaterThan(0);
  expect(opportunity.estimation?.assumptions).toBe(saved.assumptions);
});
