import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  render(<MemoryRouter><UnsavedProvider><OpportunityServiceContext.Provider value={service}><ClientPicker selected={client} onSelect={onSelect} lookups={{ currencies: [], accountTypes: [{ id: '4', label: 'Enterprise' }], industries: [{ id: '8', label: 'Technology' }] }} disabled={false} canCreate canUpdate /></OpportunityServiceContext.Provider></UnsavedProvider></MemoryRouter>);
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

it('keeps required and format errors scoped to each contact as contacts change', async () => {
  const client: OpportunityClient = {
    id: '99', revision: 1, name: 'Existing client', relationship: '', accountTypeId: 'Enterprise', industryId: 'Technology',
    accountTypeName: 'Enterprise', industryName: 'Technology', website: 'https://example.com', address: 'Main Street',
    streetAddress: 'Main Street', country: 'India', stateProvince: 'Maharashtra', city: 'Pune',
    primaryContact: { name: 'Test Contact', title: 'Manager', email: 'test@example.com', phone: '1234567890', decisionRole: 'Decision Maker' },
    additionalContacts: [], allowedActions: [],
  };

  const saveClient = vi.fn();
  const service = { ...productionOpportunityService, clients: vi.fn(async () => ({ nodes: [client], totalCount: 1, hasNextPage: false, endCursor: null })), saveClient };
  render(<MemoryRouter><UnsavedProvider><OpportunityServiceContext.Provider value={service}><ClientPicker selected={client} onSelect={vi.fn()} lookups={{ currencies: [], accountTypes: [{ id: '4', label: 'Enterprise' }], industries: [{ id: '8', label: 'Technology' }] }} disabled={false} canCreate canUpdate /></OpportunityServiceContext.Provider></UnsavedProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Client' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Edit client' }));
  const first = within(dialog.getByRole('group', { name: 'Contact 1' }));
  const second = within(dialog.getByRole('group', { name: 'Contact 2' }));
  fireEvent.change(first.getByLabelText(/Email/), { target: { value: 'invalid' } });
  fireEvent.change(first.getByLabelText(/Phone/), { target: { value: 'abc' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save client' }));
  for (const label of [/Full name/, /Title \/ role/, /Email/, /Phone/, /Role in decision/]) {
    expect(dialog.getAllByLabelText(label)[0]).toHaveAttribute('aria-invalid', 'false');
    expect(first.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
  }
  expect(first.getByText('Enter a valid email address.')).toBeInTheDocument();
  expect(first.getByText('Enter digits only for Phone.')).toBeInTheDocument();
  expect(second.getByText('Please fill the Email.')).toBeInTheDocument();
  fireEvent.change(first.getByLabelText(/Email/), { target: { value: 'valid@example.com' } });
  expect(first.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'false');
  expect(second.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
  fireEvent.click(first.getByRole('button', { name: 'Remove contact 1' }));
  expect(within(dialog.getByRole('group', { name: 'Contact 1' })).getByText('Please fill the Email.')).toBeInTheDocument();
  expect(dialog.getAllByLabelText(/Email/)[0]).toHaveAttribute('aria-invalid', 'false');
  expect(saveClient).not.toHaveBeenCalled();
});

it('does not offer client editing when only creation permission is granted', () => {
  const client: OpportunityClient = {
    id: '99', revision: 1, name: 'Existing client', relationship: '', accountTypeId: 'Enterprise', industryId: 'Technology',
    accountTypeName: 'Enterprise', industryName: 'Technology', website: 'https://example.com', address: 'Main Street',
    streetAddress: 'Main Street', country: 'India', stateProvince: 'Maharashtra', city: 'Pune',
    primaryContact: { name: 'Test Contact', title: 'Manager', email: 'test@example.com', phone: '1234567890', decisionRole: 'Decision Maker' },
    additionalContacts: [], allowedActions: [],
  };

  const service = { ...productionOpportunityService, clients: vi.fn(async () => ({ nodes: [client], totalCount: 1, hasNextPage: false, endCursor: null })) };
  render(<MemoryRouter><UnsavedProvider><OpportunityServiceContext.Provider value={service}><ClientPicker selected={client} onSelect={vi.fn()} lookups={{ currencies: [], accountTypes: [], industries: [] }} disabled={false} canCreate /></OpportunityServiceContext.Provider></UnsavedProvider></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Edit Client' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add Client' })).toBeEnabled();
});
