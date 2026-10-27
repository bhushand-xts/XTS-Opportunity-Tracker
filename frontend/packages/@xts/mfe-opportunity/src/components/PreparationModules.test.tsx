import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Estimation, OpportunityDetail } from '@xts/api-contracts';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';
import { EstimationModule } from './PreparationModules';

afterEach(cleanup);

const mastersMock = { request: { query: GET_ESTIMATION_MASTERS }, result: { data: { estimationPhasesList: [], rateMasters: [], currencies: [] } }, maxUsageCount: 100 };
function withProviders(children: React.ReactNode) { return <MockedProvider mocks={[mastersMock]}>{children}</MockedProvider>; }
const initial = () => fixtureOpportunity({ stageId: 3, subStageId: 7, state: 'IN_PROGRESS', estimation: null, allowedActions: ['EDIT_ESTIMATION', 'SUBMIT_ESTIMATE'] });

it('lets Estimation Team create and save a matrix at stage 3, then submit the saved revision to CEO', async () => {
  const start = initial();
  const saveEstimation = vi.fn(async ({ estimation }: { estimation: Estimation }) => ({ ...start, estimation: { ...estimation, revision: 1 } }));
  const decide = vi.fn(async () => ({ ...start, stageId: 4, subStageId: 8, allowedActions: [] } as OpportunityDetail));
  function Workspace() {
    const [record, setRecord] = useState(start);
    return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimation, decide }}><EstimationModule opportunity={record} onSaved={setRecord} readOnly={false} /></OpportunityServiceContext.Provider>;
  }
  render(withProviders(<Workspace />));
  fireEvent.click(await screen.findByRole('button', { name: 'Add row' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Work item 1' }), { target: { value: 'Engineering' } });
  for (const [name, value] of [['Hours 1', '1.25'], ['People 1', '2'], ['Rate 1', '100.10']]) fireEvent.change(screen.getByRole('spinbutton', { name }), { target: { value } });
  expect(screen.queryByRole('button', { name: 'Submit Estimation to CEO' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save estimation' }));
  await waitFor(() => expect(saveEstimation).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ total: '250.25' }) })));
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Estimation to CEO' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
  await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SUBMIT_ESTIMATE', expectedStageId: 3, expectedSubStageId: 7 })));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save estimation' })).not.toBeInTheDocument());
});

it('keeps estimation read-only once the opportunity has moved past preparation, even if an old edit action is present', async () => {
  render(withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><EstimationModule opportunity={{ ...initial(), state: 'GATE1_PENDING' }} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>));
  await screen.findByText('No additional items.');
  expect(screen.queryByRole('button', { name: 'Save estimation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument();
});
