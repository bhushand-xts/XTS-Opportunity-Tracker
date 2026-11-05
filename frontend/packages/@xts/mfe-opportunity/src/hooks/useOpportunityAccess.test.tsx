import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import type { ListFilter } from '@xts/api-contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GET_OPPORTUNITY_MENUS } from '@xts/design-system';
import { OpportunityAccessProvider, useOpportunityAccess } from './useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { PipelinePage } from '../components/PipelinePage';

const auth = vi.hoisted(() => ({ grants: {} as Record<string, string[]>, roleName: null as string | null }));
vi.mock('@xts/design-system', async () => ({
  ...await vi.importActual('@xts/design-system'),
  useAuth: () => ({ session: { userId: '7' }, roleName: auth.roleName, hasPermission: (key: string, permission: string) => auth.grants[key]?.includes(permission) ?? false }),
}));
afterEach(cleanup);
beforeEach(() => { auth.grants = {}; auth.roleName = null; });
const menus = [
  { menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', icon: null, parentId: null, sortOrder: 1, routePath: null, isActive: true },
  { menuId: 2, menuKey: 'pipeline', menuName: 'Pipeline', icon: null, parentId: 1, sortOrder: 2, routePath: '/opportunities', isActive: true },
  { menuId: 3, menuKey: 'my_approvals', menuName: 'My Approvals', icon: null, parentId: 1, sortOrder: 3, routePath: '/opportunities/approvals', isActive: true },
  { menuId: 4, menuKey: 'my_work', menuName: 'My Work', icon: null, parentId: 1, sortOrder: 4, routePath: '/opportunities/work', isActive: true },
];
function Access() { const access = useOpportunityAccess(); return <output data-testid="access">{JSON.stringify(access)}</output>; }
function setup(queue?: ListFilter['queue']) {
  const list = vi.fn(async () => ({ nodes: [], totalCount: 0, endCursor: null, hasNextPage: false }));
  const tree = () => <MockedProvider mocks={[{ request: { query: GET_OPPORTUNITY_MENUS }, result: { data: { menus: menus.map(menu => ({ ...menu, __typename: 'Menu' })) } } }]}>
    <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, list, globalActions: async () => ['CLIENT_UPDATE'] }}>
      <MemoryRouter><OpportunityAccessProvider><Access />{queue && <PipelinePage queue={queue} />}</OpportunityAccessProvider></MemoryRouter>
    </OpportunityServiceContext.Provider>
  </MockedProvider>;
  const rendered = render(tree());
  return { list, refresh: () => rendered.rerender(tree()) };
}
it('uses menu assignments for a user without inspecting their role name', async () => {
  auth.grants = { opportunities: ['add', 'edit', 'view'], pipeline: ['view'], my_approvals: ['view', 'approve'] };
  setup();
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ userId: '7', view: true, pipeline: true, add: true, edit: true, approvals: true });
});
it('does not turn My Approvals Add/Edit permissions into opportunity creation or editing', async () => {
  auth.grants = { opportunities: ['view'], my_approvals: ['view', 'add', 'edit'] };
  setup();
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ view: true, add: false, edit: false, approvals: true });
});
it('denies access when there are no assigned permissions', async () => {
  setup();
  expect(await screen.findByText('Access unavailable')).toBeInTheDocument();
  expect(screen.queryByTestId('access')).not.toBeInTheDocument();
});
it('blocks Pipeline and hides Add Opportunity with root View and full My Work/My Approvals rights', async () => {
  auth.grants = { opportunities: ['view'], my_work: ['view', 'add', 'edit', 'delete', 'approve'], my_approvals: ['view', 'add', 'edit', 'delete', 'approve'] };
  const { list } = setup('PIPELINE');
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ pipeline: false, add: false, edit: false, work: true, approvals: true, clientCreate: false, clientUpdate: false });
  expect(await screen.findByText('You do not currently have access to Opportunity pipeline.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Add Opportunity/i })).not.toBeInTheDocument();
  expect(list).not.toHaveBeenCalled();
});

it.each(['Sales Head', 'CEO', 'Estimation Team'])('does not grant submenu access from the %s role alone', async roleName => {
  auth.roleName = roleName;
  auth.grants = { opportunities: ['view'] };
  setup();
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ view: true, pipeline: false, work: false, approvals: false });
});

it.each(['PIPELINE', 'MY_WORK', 'MY_APPROVALS'] as const)('denies a direct %s page when its parent View permission is absent', async queue => {
  auth.grants = { opportunities: ['add', 'edit'], pipeline: ['view'], my_work: ['view'], my_approvals: ['view'] };
  const { list } = setup(queue);
  expect(await screen.findByText('You do not currently have access to Opportunities.')).toBeVisible();
  expect(screen.queryByTestId('access')).not.toBeInTheDocument();
  expect(list).not.toHaveBeenCalled();
});

it.each(['PIPELINE', 'MY_WORK', 'MY_APPROVALS'] as const)('revokes an open %s page when parent View is removed', async queue => {
  auth.grants = { opportunities: ['view'], pipeline: ['view'], my_work: ['view'], my_approvals: ['view'] };
  const { list, refresh } = setup(queue);
  await waitFor(() => expect(list).toHaveBeenCalledOnce());
  auth.grants = { pipeline: ['view'], my_work: ['view'], my_approvals: ['view'] };
  refresh();
  expect(await screen.findByRole('heading', { name: 'Your access has changed' })).toBeVisible();
  expect(screen.queryByTestId('access')).not.toBeInTheDocument();
  expect(list).toHaveBeenCalledOnce();
});

it.each([
  ['PIPELINE', 'pipeline'], ['MY_WORK', 'my_work'], ['MY_APPROVALS', 'my_approvals'],
] as const)('revokes an open %s page when that submenu View is removed', async (queue, menuKey) => {
  auth.grants = { opportunities: ['view'], pipeline: ['view'], my_work: ['view'], my_approvals: ['view'] };
  const { list, refresh } = setup(queue);
  await waitFor(() => expect(list).toHaveBeenCalledOnce());
  auth.grants = { ...auth.grants, [menuKey]: [] };
  refresh();
  expect(await screen.findByRole('heading', { name: 'Your access has changed' })).toBeVisible();
  expect(list).toHaveBeenCalledOnce();
});
