import { cleanup, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GET_OPPORTUNITY_MENUS } from '@xts/design-system';
import { OpportunityAccessProvider, useOpportunityAccess } from './useOpportunityAccess';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { PipelinePage } from '../components/PipelinePage';

const auth = vi.hoisted(() => ({ grants: {} as Record<string, string[]> }));
vi.mock('@xts/design-system', async () => ({
  ...await vi.importActual('@xts/design-system'),
  useAuth: () => ({ session: { userId: '7' }, hasPermission: (key: string, permission: string) => auth.grants[key]?.includes(permission) ?? false }),
}));
afterEach(cleanup);
beforeEach(() => { auth.grants = {}; });
const menus = [
  { menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', icon: null, parentId: null, sortOrder: 1, routePath: null, isActive: true },
  { menuId: 2, menuKey: 'pipeline', menuName: 'Pipeline', icon: null, parentId: 1, sortOrder: 2, routePath: '/opportunities', isActive: true },
  { menuId: 3, menuKey: 'my_approvals', menuName: 'My Approvals', icon: null, parentId: 1, sortOrder: 3, routePath: '/opportunities/approvals', isActive: true },
  { menuId: 4, menuKey: 'my_work', menuName: 'My Work', icon: null, parentId: 1, sortOrder: 4, routePath: '/opportunities/work', isActive: true },
];
function Access() { const access = useOpportunityAccess(); return <output data-testid="access">{JSON.stringify(access)}</output>; }
function setup(pipeline = false) {
  const list = vi.fn(async () => ({ nodes: [], totalCount: 0, endCursor: null, hasNextPage: false }));
  render(<MockedProvider mocks={[{ request: { query: GET_OPPORTUNITY_MENUS }, result: { data: { menus: menus.map(menu => ({ ...menu, __typename: 'Menu' })) } } }]}>
    <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, list, globalActions: async () => ['CLIENT_UPDATE'] }}>
      <MemoryRouter><OpportunityAccessProvider><Access />{pipeline && <PipelinePage />}</OpportunityAccessProvider></MemoryRouter>
    </OpportunityServiceContext.Provider>
  </MockedProvider>);
  return list;
}
it('uses menu assignments for a user without inspecting their role name', async () => {
  auth.grants = { opportunities: ['add', 'edit', 'view'], pipeline: ['view'], my_approvals: ['view', 'approve'] };
  setup();
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ userId: '7', view: true, pipeline: true, add: true, edit: true, approvals: true });
});
it('does not turn My Approvals Add/Edit permissions into opportunity creation or editing', async () => {
  auth.grants = { my_approvals: ['view', 'add', 'edit'] };
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
  const list = setup(true);
  const output = await screen.findByTestId('access');
  expect(JSON.parse(output.textContent!)).toMatchObject({ pipeline: false, add: false, edit: false, work: true, approvals: true, clientCreate: false, clientUpdate: false });
  expect(await screen.findByText('You do not currently have access to Opportunity pipeline.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Add Opportunity/i })).not.toBeInTheDocument();
  expect(list).not.toHaveBeenCalled();
});
