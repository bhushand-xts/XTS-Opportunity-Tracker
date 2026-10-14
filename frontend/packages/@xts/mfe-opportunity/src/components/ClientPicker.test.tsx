import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { OpportunityClient } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { UnsavedProvider } from '../hooks/useUnsaved';
import { ClientPicker } from './ClientPicker';

afterEach(cleanup);
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});

it('opens and saves a selected existing client with directory labels resolved to lookup IDs', async () => {
  const client: OpportunityClient = {
    id: '99', revision: 1, name: 'Existing client', relationship: '', accountTypeId: 'Enterprise', industryId: 'Technology',
    accountTypeName: 'Enterprise', industryName: 'Technology', website: 'https://example.com', address: 'Main Street',
    streetAddress: 'Main Street', country: 'India', stateProvince: 'Maharashtra', city: 'Pune',
    primaryContact: { name: 'Test Contact', title: 'Manager', email: 'test@example.com', phone: '1234567890', decisionRole: 'Decision Maker' },
    additionalContacts: [], allowedActions: [],
  };
  const onSelect = vi.fn();
  const saveClient = vi.fn(async () => ({ ...client, name: 'Updated client' }));
  const service = { ...productionOpportunityService, clients: vi.fn(async () => ({ nodes: [client], totalCount: 1, hasNextPage: false, endCursor: null })), saveClient };
  render(<MemoryRouter><UnsavedProvider><OpportunityServiceContext.Provider value={service}><ClientPicker selected={client} onSelect={onSelect} lookups={{ currencies: [], accountTypes: [{ id: '4', label: 'Enterprise' }], industries: [{ id: '8', label: 'Technology' }] }} disabled={false} canCreate /></OpportunityServiceContext.Provider></UnsavedProvider></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Client' })).toBeEnabled());
  fireEvent.click(screen.getByRole('combobox', { name: 'Client' }));
  fireEvent.change(await screen.findByRole('searchbox', { name: 'Search Client' }), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('option', { name: 'Existing client' }));
  expect(onSelect).toHaveBeenCalledWith(client);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Client' }));
  expect(screen.getByRole('dialog', { name: 'Edit client' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Account type' })).toHaveTextContent('Enterprise');
  expect(screen.getByRole('combobox', { name: 'Sector / industry' })).toHaveTextContent('Technology');
  fireEvent.change(screen.getByLabelText(/Organization \/ account name/), { target: { value: 'Updated client' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }));
  await waitFor(() => expect(saveClient).toHaveBeenCalledWith(expect.objectContaining({ id: '99', form: expect.objectContaining({ name: 'Updated client', accountTypeId: '4', industryId: '8' }) })));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '99', name: 'Updated client' })));
});
