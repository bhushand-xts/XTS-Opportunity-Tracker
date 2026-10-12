import { useState } from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DirectoryUser } from '@xts/api-contracts';
import { GET_OPPORTUNITY_OWNER_DIRECTORY, type OwnerDirectoryData } from '../services/userDirectory.queries';
import { OpportunityOwnerSelect } from './OpportunityOwnerSelect';

const data: OwnerDirectoryData = {
  userList: [
    { id: 42, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', roleId: 7, isActive: true },
    { id: 84, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', roleId: null, isActive: true },
    { id: 19, firstName: 'Inactive', lastName: 'Owner', email: 'legacy@example.com', roleId: 7, isActive: false },
  ],
  rolesList: [{ id: 7, roleName: 'Engineering', roleCode: 'ENG', isActive: true }],
};
const inactiveOwner: DirectoryUser = { id: '19', name: 'Inactive Owner', email: 'legacy@example.com', roles: ['Engineering'], active: false };
function directoryMock(result = data): MockedResponse<OwnerDirectoryData> {
  return { request: { query: GET_OPPORTUNITY_OWNER_DIRECTORY }, result: { data: result } };
}
function StatefulOwner({ initial = '', selected }: { initial?: string; selected?: DirectoryUser }) {
  const [value, setValue] = useState(initial);
  return <><OpportunityOwnerSelect value={value} selected={selected} onChange={setValue} /><output aria-label="Chosen user ID">{value}</output></>;
}
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  window.PointerEvent ??= MouseEvent as typeof PointerEvent;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Opportunity owner selection from the real master API shape', () => {
  it('lists active user names, emails and roles and selects their string user IDs', async () => {
    render(<MockedProvider mocks={[directoryMock()]}><StatefulOwner /></MockedProvider>);
    expect(screen.getByText('Loading owner directory…')).toBeInTheDocument();
    await screen.findByText('Choose an active user from the user directory.');
    fireEvent.keyDown(screen.getByLabelText('Opportunity owner'), { key: 'Enter' });
    const option = await screen.findByText('Ada Lovelace · ada@example.com · Engineering');
    expect(option.closest('[role="option"]')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper · grace@example.com').closest('[role="option"]')).toBeInTheDocument();
    expect(screen.queryByText(/Inactive Owner/)).not.toBeInTheDocument();
    fireEvent.click(option);
    expect(screen.getByLabelText('Chosen user ID')).toHaveTextContent('42');
  });

  it('retains an inactive current owner as a disabled choice until a replacement is chosen', async () => {
    render(<MockedProvider mocks={[directoryMock()]}><StatefulOwner initial="19" selected={inactiveOwner} /></MockedProvider>);
    await screen.findByText('Choose an active user from the user directory.');
    const trigger = screen.getByLabelText('Opportunity owner');
    expect(trigger).toHaveTextContent('Inactive Owner');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const inactiveOption = await screen.findByText(/Inactive Owner/, { selector: '[role="option"] > span:last-child' });
    expect(inactiveOption.closest('[role="option"]')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByText('Grace Hopper · grace@example.com'));
    expect(screen.getByLabelText('Chosen user ID')).toHaveTextContent('84');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.queryByText(/Inactive Owner/)).not.toBeInTheDocument();
  });

  it('searches email and role while retaining the displayed current assignment', async () => {
    render(<MockedProvider mocks={[directoryMock()]}><StatefulOwner initial="42" /></MockedProvider>);
    await screen.findByText('Choose an active user from the user directory.');
    const search = screen.getByLabelText('Search opportunity owners'), trigger = screen.getByLabelText('Opportunity owner');
    fireEvent.change(search, { target: { value: 'GRACE@' } });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(await screen.findByText('Grace Hopper · grace@example.com')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.change(search, { target: { value: 'engineering' } });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(await screen.findByText('Ada Lovelace · ada@example.com · Engineering', { selector: '[role="option"] > span:last-child' })).toBeInTheDocument();
    expect(screen.queryByText('Grace Hopper · grace@example.com')).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.change(search, { target: { value: 'no matching owner' } });
    expect(screen.getByText('No active users match your search.')).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Ada Lovelace');
    expect(screen.getByLabelText('Chosen user ID')).toHaveTextContent('42');
  });

  it('shows API errors and retries without creating fake choices', async () => {
    const failure: MockedResponse = { request: { query: GET_OPPORTUNITY_OWNER_DIRECTORY }, error: new Error('User service offline') };
    render(<MockedProvider mocks={[failure, directoryMock()]}><StatefulOwner initial="19" selected={inactiveOwner} /></MockedProvider>);
    expect(await screen.findByText('User service offline')).toBeInTheDocument();
    expect(screen.getByLabelText('Opportunity owner')).toBeDisabled();
    expect(screen.getByLabelText('Opportunity owner')).toHaveTextContent('Inactive Owner');
    fireEvent.click(screen.getByText('Retry'));
    await screen.findByText('Choose an active user from the user directory.');
    await waitFor(() => expect(screen.getByLabelText('Opportunity owner')).toBeEnabled());
  });

  it('distinguishes an empty directory from a failed or null response', async () => {
    const view = render(<MockedProvider mocks={[directoryMock({ userList: [], rolesList: [] })]}><StatefulOwner /></MockedProvider>);
    expect(await screen.findByText('No active users are available to assign.')).toBeInTheDocument();
    view.unmount();
    render(<MockedProvider mocks={[directoryMock({ userList: null, rolesList: [] })]}><StatefulOwner /></MockedProvider>);
    expect(await screen.findByText('The owner directory returned no user data. Please retry.')).toBeInTheDocument();
    expect(screen.queryByText('No active users are available to assign.')).not.toBeInTheDocument();
  });

  it('keeps the assigned owner visible in a read-only form without loading the directory', () => {
    render(<MockedProvider mocks={[]}><OpportunityOwnerSelect value="19" selected={inactiveOwner} onChange={vi.fn()} disabled /></MockedProvider>);
    expect(screen.getByLabelText('Opportunity owner')).toBeDisabled();
    expect(screen.getByLabelText('Opportunity owner')).toHaveTextContent('Inactive Owner');
    expect(screen.queryByLabelText('Search opportunity owners')).not.toBeInTheDocument();
  });
});
