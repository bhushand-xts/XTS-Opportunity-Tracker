import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { Choice } from './ui';
import { SearchableSelect } from './SearchableSelect';

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
it('renders a closed searchable dropdown', () => {
  render(<SearchableSelect id="closed" label="Closed" value="" options={[]} onChange={vi.fn()} />);
  expect(screen.getByRole('combobox', { name: 'Closed' })).toHaveTextContent('Select...');
});

it.each(['Currency', 'Lead source', 'Service line', 'Account type', 'Role in decision'])('filters and selects %s while preserving the selected ID', label => {
  function Harness() {
    const [value, setValue] = useState('1');
    return <><Choice label={label} value={value} options={[{ id: '1', label: 'Alpha choice' }, { id: '2', label: 'Beta choice' }]} onChange={setValue} searchable required /><output aria-label="Selected ID">{value}</output></>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  const search = screen.getByLabelText(`Search ${label}`);
  fireEvent.change(search, { target: { value: 'beta' } });
  expect(screen.queryByRole('option', { name: 'Alpha choice' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: 'Beta choice' }));
  expect(screen.getByLabelText('Selected ID')).toHaveTextContent('2');
  expect(screen.getByRole('combobox', { name: label })).toHaveTextContent('Beta choice');
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  expect(screen.getByRole('option', { name: 'Alpha choice' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('combobox', { name: label }));
});

it('searches keywords, reports no matches and keeps disabled choices unselectable', () => {
  const onChange = vi.fn();
  render(<SearchableSelect id="owner" label="Opportunity owner" value="1" options={[{ id: '1', label: 'Ada Lovelace', keywords: ['ada@example.com'] }, { id: '2', label: 'Inactive owner', disabled: true }]} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Opportunity owner' }), { key: 'ArrowDown' });
  const search = screen.getByLabelText('Search Opportunity owner');
  fireEvent.change(search, { target: { value: 'ada@example.com' } });
  expect(screen.getByRole('option', { name: 'Ada Lovelace' })).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'missing' } });
  expect(screen.getByText('No matching options.')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Opportunity owner' })).toHaveTextContent('Ada Lovelace');
  fireEvent.change(search, { target: { value: 'inactive' } });
  const inactive = screen.getByRole('option', { name: 'Inactive owner' });
  expect(inactive).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(inactive);
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('combobox', { name: 'Opportunity owner' }));
});
