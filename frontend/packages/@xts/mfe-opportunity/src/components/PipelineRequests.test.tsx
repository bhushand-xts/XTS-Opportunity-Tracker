import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from '@apollo/client';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AppShell } from '@xts/design-system';
import { App as OpportunityApp } from '../App';

const api = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api.client }));
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

it('keeps list and owner-directory requests stable through real shell auth and cache updates', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia ??= vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const requests: string[] = [];
  const menus = [
    { __typename: 'Menu', menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', icon: null, parentId: null, sortOrder: 1, routePath: null, isActive: true, children: [] },
    { __typename: 'Menu', menuId: 2, menuKey: 'pipeline', menuName: 'Pipeline', icon: null, parentId: 1, sortOrder: 2, routePath: '/opportunities', isActive: true, children: [] },
  ];
  const grants = [{ menuKey: 'opportunities', permissionKey: 'view' }, { menuKey: 'opportunities', permissionKey: 'add' }, { menuKey: 'pipeline', permissionKey: 'view' }];
  const client = new ApolloClient({ cache: new InMemoryCache({ typePolicies: { Menu: { keyFields: ['menuId'] } } }), link: new ApolloLink(operation => new Observable(observer => {
    requests.push(operation.operationName);
    const data = operation.operationName === 'ListOpportunities' ? { opportunities: [], currencies: [] } :
      operation.operationName === 'GetOpportunityOwnerDirectory' ? { userList: [], rolesList: [] } :
      operation.operationName === 'OpportunityClientCreateAccess' ? { opportunityClientCreateAllowed: true, opportunityClientUpdateAllowed: false } :
      operation.operationName === 'RoleAccessForAuth' ? { roleAccess: grants } : { menus };
    observer.next({ data }); observer.complete();
  })) });
  api.client = client;
  const session = { session: { userId: '7', email: 'admin@example.test', token: 'test-token' }, profile: { first_name: 'Admin', last_name: 'User', status: 'approved' }, roleId: 15, roleName: 'Super Admin', access: { opportunities: ['view', 'add'], pipeline: ['view'] } };
  const refreshAuth = () => window.dispatchEvent(new StorageEvent('storage', { key: 'authState', newValue: JSON.stringify(session) }));
  refreshAuth();
  render(<ApolloProvider client={client}><MemoryRouter initialEntries={['/opportunity']}><AppShell>
    <Routes><Route path="/opportunity/*" element={<OpportunityApp />} /></Routes>
  </AppShell></MemoryRouter></ApolloProvider>);
  await screen.findByText('Your pipeline starts here');
  const count = (name: string) => requests.filter(request => request === name).length;
  expect(count('ListOpportunities')).toBe(1);
  expect(count('GetOpportunityOwnerDirectory')).toBe(1);
  for (let i = 0; i < 3; i++) {
    await act(async () => { refreshAuth(); window.dispatchEvent(new Event('focus')); });
  }
  await waitFor(() => expect(count('RoleAccessForAuth')).toBeGreaterThan(0));
  expect(count('ListOpportunities')).toBe(1);
  expect(count('GetOpportunityOwnerDirectory')).toBe(1);
  client.stop();
});
