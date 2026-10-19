import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { PipelinePage } from './PipelinePage';

afterEach(cleanup);
function mount(currencyCode: string, estimatedValueUsd: string, currencySymbol?: string) {
  const opportunity = fixtureOpportunity({ currencyCode, currencySymbol, estimatedValue: '43540.00', estimatedValueUsd });
  const service = { ...productionOpportunityService, list: vi.fn(async () => ({ nodes: [opportunity], totalCount: 1, endCursor: null, hasNextPage: false })) };
  render(<MemoryRouter><OpportunityServiceContext.Provider value={service}>
    <OpportunityAccessContext.Provider value={{ view: true, pipeline: true, work: false, approvals: false, add: false, edit: false }}><PipelinePage /></OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MemoryRouter>);
}
it.each([['INR', '₹43,540.00'], ['EUR', '€43,540.00'], ['GBP', '£43,540.00'], ['USD', '$43,540.00']])('shows %s and USD estimates with their symbols on the card and list', async (code, expected) => {
  mount(code, '1200.50');
  const card = within(await screen.findByRole('link', { name: 'View Cloud transformation' }));
  expect(card.getByText(expected)).toBeInTheDocument();
  expect(card.getByText('$1,200.50')).toBeInTheDocument();
  expect(card.getByText('Estimated value (USD)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'List' }));
  const table = within(screen.getByRole('table', { hidden: true }));
  expect(table.getByText(expected)).toBeInTheDocument();
  expect(table.getByText('$1,200.50')).toBeInTheDocument();
});
it('uses the configured currency symbol even when the code is nonstandard', async () => {
  mount('B', '56', '฿');
  const card = within(await screen.findByRole('link', { name: 'View Cloud transformation' }));
  expect(card.getByText('฿ 43,540.00')).toBeInTheDocument();
});
it.each([['', 'Not provided'], ['0', '$0.00']])('distinguishes a missing USD estimate from zero (%s)', async (usd, expected) => {
  mount('EUR', usd);
  const card = within(await screen.findByRole('link', { name: 'View Cloud transformation' }));
  expect(card.getByText(expected)).toBeInTheDocument();
});
it('totals the saved USD estimates for Pipeline value across different selected currencies', async () => {
  const nodes = ['INR', 'EUR', 'GBP', 'USD'].map((currencyCode, index) => fixtureOpportunity({
    id: String(index + 1), currencyCode, estimatedValue: '43540.00', estimatedValueUsd: ['1000.10', '2000.20', '', '0'][index],
  }));
  const service = { ...productionOpportunityService, list: vi.fn(async () => ({ nodes, totalCount: nodes.length, endCursor: null, hasNextPage: false })) };
  render(<MemoryRouter><OpportunityServiceContext.Provider value={service}>
    <OpportunityAccessContext.Provider value={{ view: true, pipeline: true, work: false, approvals: false, add: false, edit: false }}><PipelinePage /></OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MemoryRouter>);
  const label = await screen.findByText('Pipeline value');
  const summary = within(label.closest('section')!);
  expect(summary.getByText('$3,000.30')).toBeInTheDocument();
  expect(summary.getByText('Total estimated value (USD)')).toBeInTheDocument();
  expect(screen.queryByText('4 currencies')).not.toBeInTheDocument();
});
