import { MockedProvider } from '@apollo/client/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { GET_OPPORTUNITY_MENUS, type OpportunityMenuRecord } from '../lib/opportunityMenu';

const auth = vi.hoisted(() => ({ roleName: 'Sales Representative', grants: {} as Record<string, string[]> }));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    roleName: auth.roleName,
    profile: { first_name: 'Test', last_name: 'User' },
    signOut: vi.fn(async () => undefined),
    can: () => false,
    hasMenuAccess: (key: string) => Boolean(auth.grants[key]?.length),
    hasPermission: (key: string, permission: string) => auth.grants[key]?.includes(permission) ?? false,
  }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

const menus: OpportunityMenuRecord[] = [
  { menuId: 80, menuName: 'Opportunities', menuKey: 'opportunities', parentId: null, routePath: '/opportunity', icon: null, isActive: true, sortOrder: 1 },
  { menuId: 81, menuName: 'Pipeline', menuKey: 'pipeline', parentId: 80, routePath: '/opportunity', icon: null, isActive: true, sortOrder: 1 },
  { menuId: 82, menuName: 'My Work', menuKey: 'my_work', parentId: 80, routePath: '/opportunity/work', icon: null, isActive: true, sortOrder: 2 },
  { menuId: 83, menuName: 'My Approvals', menuKey: 'my_approvals', parentId: 80, routePath: '/opportunity/approvals', icon: null, isActive: true, sortOrder: 3 },
];
const children = [
  ['pipeline', 'Pipeline', '/opportunity'],
  ['my_work', 'My Work', '/opportunity/work'],
  ['my_approvals', 'My Approvals', '/opportunity/approvals'],
] as const;

function mount(records = menus) {
  const mocks = [{ request: { query: GET_OPPORTUNITY_MENUS }, result: { data: { menus: records.map(menu => ({ ...menu, __typename: 'Menu' })) } }, maxUsageCount: Number.POSITIVE_INFINITY }];
  const tree = () => <MockedProvider mocks={mocks}>
    <MemoryRouter initialEntries={['/opportunity']}><AppShell><p>Opportunity content</p></AppShell></MemoryRouter>
  </MockedProvider>;
  const view = render(tree());
  return { refresh: () => view.rerender(tree()) };
}

beforeEach(() => {
  auth.roleName = 'Sales Representative';
  auth.grants = { opportunities: ['view'] };
  window.localStorage.removeItem('devNavPreview');
});
afterEach(cleanup);

describe('Opportunities sidebar permission hierarchy', () => {
  it('shows all three configured links for a user with their View grants, regardless of role', async () => {
    auth.grants = Object.fromEntries(menus.map(menu => [menu.menuKey, ['view']]));
    mount();

    expect(await screen.findByRole('button', { name: 'Opportunities' })).toBeInTheDocument();
    for (const [, label, path] of children) expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', path);
  });

  it.each(children)('requires the individual View grant for %s', async (key, label, path) => {
    auth.grants[key] = ['view'];
    for (const [other] of children) if (other !== key) auth.grants[other] = ['edit', 'approve'];
    mount();

    expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', path);
    for (const [other, otherLabel] of children) if (other !== key) expect(screen.queryByRole('link', { name: otherLabel })).not.toBeInTheDocument();
  });

  it.each(['CEO', 'Sales Head', 'Estimation Team'])('does not add links just because the user is %s', async role => {
    auth.roleName = role;
    mount();

    await screen.findByRole('button', { name: 'Opportunities' });
    for (const [, label] of children) expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
  });

  it('does not invent child menus when only the Opportunities record exists', async () => {
    auth.roleName = 'Sales Head';
    auth.grants = Object.fromEntries(menus.map(menu => [menu.menuKey, ['view']]));
    mount([menus[0]]);

    await screen.findByRole('button', { name: 'Opportunities' });
    for (const [, label] of children) expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
  });

  it('hides the entire tree when parent View is revoked, even with child grants retained', async () => {
    auth.grants = Object.fromEntries(menus.map(menu => [menu.menuKey, ['view']]));
    const { refresh } = mount();
    await screen.findByRole('link', { name: 'My Approvals' });

    auth.grants.opportunities = ['edit', 'add'];
    refresh();

    expect(screen.queryByRole('button', { name: 'Opportunities' })).not.toBeInTheDocument();
    for (const [, label] of children) expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Opportunity content')).toBeInTheDocument();
  });

  it.each(children)('hides only %s when its View grant is revoked', async (key, label) => {
    auth.grants = Object.fromEntries(menus.map(menu => [menu.menuKey, ['view']]));
    const { refresh } = mount();
    await screen.findByRole('link', { name: label });

    delete auth.grants[key];
    refresh();

    expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opportunities' })).toBeInTheDocument();
    for (const [other, otherLabel] of children) if (other !== key) expect(screen.getByRole('link', { name: otherLabel })).toBeInTheDocument();
  });
});
