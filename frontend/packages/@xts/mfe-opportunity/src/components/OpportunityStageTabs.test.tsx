import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { OpportunityDetail } from '@xts/api-contracts';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';

afterEach(cleanup);

const tabs = ['RFP Q&A', 'Scope & Assessment', 'Estimate', 'Documents', 'Activity'];

function mount(opportunity: OpportunityDetail, review = false, decide = vi.fn(async () => opportunity)) {
  const service = { ...productionOpportunityService, detail: vi.fn(async () => opportunity), decide };
  return { ...render(<OpportunityServiceContext.Provider value={service}>
    <OpportunityAccessContext.Provider value={{ view: true, add: false, edit: false, approvals: review, work: false }}>
      <MemoryRouter initialEntries={['/opportunity/401/details?tab=qa']}>
        <Routes><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage review={review} />} /></Routes>
      </MemoryRouter>
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider>), decide };
}

it.each([[1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6]])(
  'shows only an availability message in the five later tabs during stage %s / substage %s', async (stageId, subStageId) => {
    mount(fixtureOpportunity({ stageId, subStageId }));
    await screen.findByRole('heading', { name: 'Available after CEO approval' });
    const sidebar = screen.getByRole('complementary', { name: 'Opportunity approval and progress' });
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    for (const label of tabs) {
      fireEvent.mouseDown(screen.getByRole('tab', { name: label }));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(`${label} will be available once the CEO approves this opportunity`));
      const message = screen.getByRole('status');
      expect(message).toHaveTextContent('Solution/Scoping Estimation (Engineering) stage.');
      expect(screen.getByRole('complementary', { name: 'Opportunity approval and progress' })).toBe(sidebar);
      expect(within(sidebar).getByRole('list', { name: 'Opportunity progress history' })).toBeVisible();
      const content = within(screen.getByRole('tabpanel'));
      expect(content.queryByRole('textbox')).not.toBeInTheDocument();
      expect(content.queryByRole('table')).not.toBeInTheDocument();
      expect(content.queryByRole('button')).not.toBeInTheDocument();
      expect(content.queryByText('Opportunity created')).not.toBeInTheDocument();
    }
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Overview' }));
    expect(await screen.findByText('Opportunity progress')).toBeVisible();
    await waitFor(() => expect(screen.queryByText('Available after CEO approval')).not.toBeInTheDocument());
  },
);

it('keeps CEO review tabs visible with the same availability message before approval', async () => {
  mount(fixtureOpportunity({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_GO'] }), true);
  expect(await screen.findByRole('status')).toHaveTextContent('Available after CEO approval');
  expect(screen.getByRole('button', { name: 'Approve Go' })).toBeVisible();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Overview' }));
  expect(await screen.findByRole('button', { name: 'Approve Go' })).toBeVisible();
});

it.each([[3, 7], [4, 8], [6, 12]])('shows the workspace content after CEO approval at stage %s / substage %s', async (stageId, subStageId) => {
  mount(fixtureOpportunity({ stageId, subStageId }));
  expect(await screen.findByRole('textbox', { name: 'Answer' })).toBeVisible();
  const sidebar = screen.getByRole('complementary', { name: 'Opportunity approval and progress' });
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Scope & Assessment' }));
  expect(await screen.findByRole('textbox', { name: 'Scope summary' })).toBeVisible();
  expect(screen.getByRole('complementary', { name: 'Opportunity approval and progress' })).toBe(sidebar);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Estimate' }));
  expect(await screen.findByText('Estimation matrix')).toBeVisible();
  expect(screen.getByRole('complementary', { name: 'Opportunity approval and progress' })).toBe(sidebar);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Documents' }));
  expect(await screen.findByText('Files attached to this opportunity')).toBeVisible();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Activity' }));
  expect(await screen.findByText('Activity & decisions')).toBeVisible();
  expect(screen.getByRole('complementary', { name: 'Opportunity approval and progress' })).toBe(sidebar);
  expect(screen.queryByText('Available after CEO approval')).not.toBeInTheDocument();
});

it('shows a single estimation submission action across Q&A, Scope and Estimate', async () => {
  mount(fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['SUBMIT_ESTIMATE', 'EDIT_SCOPE', 'EDIT_ESTIMATION'] }));
  await screen.findByRole('textbox', { name: 'Answer' });
  const sidebar = screen.getByRole('complementary', { name: 'Opportunity approval and progress' });
  for (const label of ['RFP Q&A', 'Scope & Assessment', 'Estimate', 'Overview']) {
    fireEvent.mouseDown(screen.getByRole('tab', { name: label }));
    await waitFor(() => expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getAllByRole('button', { name: 'Submit Estimation to CEO' })).toHaveLength(1);
    expect(within(sidebar).getByRole('button', { name: 'Submit Estimation to CEO' })).toBeVisible();
  }
});

it('approves from the shared sidebar while Q&A is open and refreshes both progress and content', async () => {
  const approved = fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['SUBMIT_ESTIMATE'] });
  const decide = vi.fn(async () => approved);
  mount(fixtureOpportunity({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_GO'] }), true, decide);
  await screen.findByRole('heading', { name: 'Available after CEO approval' });
  fireEvent.click(screen.getByRole('button', { name: 'Approve Go' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm decision' }));
  expect(await screen.findByRole('textbox', { name: 'Answer' })).toBeVisible();
  expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'GATE1_GO', expectedStageId: 2, expectedSubStageId: 4 }));
  const sidebar = within(screen.getByRole('complementary', { name: 'Opportunity approval and progress' }));
  expect(sidebar.getByRole('button', { name: 'Submit Estimation to CEO' })).toBeVisible();
  expect(sidebar.getByRole('heading', { name: 'Solution/Scoping Estimation (Engineering)' }).closest('li')).toHaveAttribute('aria-current', 'step');
});
