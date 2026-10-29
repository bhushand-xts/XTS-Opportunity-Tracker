import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { PipelinePage } from './PipelinePage';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('keeps the existing board and summary visible while a search is pending, then replaces the results', async () => {
  const initial = fixtureOpportunity({ title: 'Original opportunity', stageId: 1, subStageId: 1 });
  const filtered = { ...initial, id: '402', title: 'Searched opportunity' };
  let finishSearch!: (value: { nodes: typeof initial[]; totalCount: number; endCursor: null; hasNextPage: boolean }) => void;
  const pending = new Promise<Parameters<typeof finishSearch>[0]>(resolve => { finishSearch = resolve; });
  const page = (nodes: typeof initial[]) => ({ nodes, totalCount: nodes.length, endCursor: null, hasNextPage: false });
  const list = vi.fn().mockResolvedValueOnce(page([initial])).mockReturnValueOnce(pending);
  render(<MemoryRouter><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, list }}>
    <OpportunityAccessContext.Provider value={{ userId: '7', view: true, pipeline: true, add: false, edit: false, work: false, approvals: false }}>
      <PipelinePage />
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MemoryRouter>);
  await screen.findByRole('link', { name: 'View Original opportunity' });
  const summary = screen.getByText('All opportunities').closest('section');
  vi.useFakeTimers();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search opportunities' }), { target: { value: 'Searched' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Searched' }), expect.any(AbortSignal));
  expect(screen.getByRole('link', { name: 'View Original opportunity' })).toBeVisible();
  expect(screen.getByText('All opportunities').closest('section')).toBe(summary);
  expect(screen.queryByText('Loading permitted opportunities…')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Search opportunities' })).toHaveValue('Searched');
  await act(async () => finishSearch(page([filtered])));
  expect(screen.getByRole('link', { name: 'View Searched opportunity' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'View Original opportunity' })).not.toBeInTheDocument();
});
