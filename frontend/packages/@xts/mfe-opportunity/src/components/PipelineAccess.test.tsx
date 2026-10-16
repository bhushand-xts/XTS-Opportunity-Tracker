import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityAccessContext, type OpportunityAccess } from '../hooks/useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { PipelinePage } from './PipelinePage';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([
  ['MY_APPROVALS', 'approvals', 'My approvals', '/opportunity', 'Go to Pipeline'],
  ['MY_WORK', 'work', 'My Work', '/opportunity', 'Go to Pipeline'],
  ['PIPELINE', 'pipeline', 'Opportunity pipeline', '/opportunity/work', 'Go to My Work'],
] as const)('explains revoked %s access without showing a technical error or fetching again', async (queue, permission, page, path, label) => {
  const list = vi.fn(async () => ({ nodes: [], totalCount: 0, endCursor: null, hasNextPage: false }));
  const service = { ...productionOpportunityService, list };
  const access: OpportunityAccess = { view: true, pipeline: true, work: true, approvals: true, add: false, edit: false };
  const tree = (current: OpportunityAccess) => <MemoryRouter>
    <OpportunityServiceContext.Provider value={service}>
      <OpportunityAccessContext.Provider value={current}><PipelinePage queue={queue} /></OpportunityAccessContext.Provider>
    </OpportunityServiceContext.Provider>
  </MemoryRouter>;
  const { rerender } = render(tree(access));
  await screen.findByText('Your pipeline starts here');
  expect(list).toHaveBeenCalledTimes(1);
  rerender(tree({ ...access, [permission]: false }));
  expect(screen.getByRole('heading', { name: 'Your access has changed' })).toBeInTheDocument();
  expect(screen.getByText(`You no longer have access to ${page}. Your permissions have been updated.`)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', path);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Search opportunities' })).not.toBeInTheDocument();
  expect(list).toHaveBeenCalledTimes(1);
});

it('shows the same guidance when the server detects removal before the menu permissions refresh', async () => {
  const list = vi.fn(async () => { throw new Error('You do not have permission to view this workflow.'); });
  render(<MemoryRouter><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, list }}>
    <OpportunityAccessContext.Provider value={{ view: true, pipeline: true, approvals: true, work: false, add: false, edit: false }}>
      <PipelinePage queue="MY_APPROVALS" />
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Your access has changed' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to Pipeline' })).toHaveAttribute('href', '/opportunity');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('does not refetch while idle or on window focus, and fetches after a search action', async () => {
  const list = vi.fn(async () => ({ nodes: [], totalCount: 0, endCursor: null, hasNextPage: false }));
  render(<MemoryRouter><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, list }}>
    <OpportunityAccessContext.Provider value={{ view: true, pipeline: true, approvals: true, work: true, add: false, edit: false }}>
      <PipelinePage />
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MemoryRouter>);
  await screen.findByText('Your pipeline starts here');
  expect(list).toHaveBeenCalledTimes(1);
  vi.useFakeTimers();
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  fireEvent.focus(window);
  expect(list).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search opportunities' }), { target: { value: 'Example' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(list).toHaveBeenCalledTimes(2);
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Example', queue: 'PIPELINE' }), expect.any(AbortSignal));
});
