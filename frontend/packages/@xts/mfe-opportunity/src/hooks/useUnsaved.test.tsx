import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { UnsavedProvider, useUnsaved } from './useUnsaved';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Form() {
  const [dirty, setDirty] = useState(false), [tab, setTab] = useState('First');
  const confirm = useUnsaved(dirty), location = useLocation();
  return <><input aria-label="Opportunity title" onChange={() => setDirty(true)} /><Link to="/pipeline">Pipeline</Link><button onClick={async () => { if (await confirm()) setTab('Second'); }}>Next tab</button><output aria-label="Current tab">{tab}</output><output aria-label="Current route">{location.pathname}</output></>;
}
it('keeps unsaved form edits when cancelled and resumes navigation when confirmed', async () => {
  const browserConfirm = vi.spyOn(window, 'confirm');
  render(<MemoryRouter initialEntries={['/new']}><UnsavedProvider><Form /></UnsavedProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Opportunity title'), { target: { value: 'Unsaved title' } });
  fireEvent.click(screen.getByRole('link', { name: 'Pipeline' }));
  expect(screen.getByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Current route')).toHaveTextContent('/new');
  expect(screen.getByLabelText('Opportunity title')).toHaveValue('Unsaved title');
  fireEvent.click(screen.getByRole('link', { name: 'Pipeline' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.getByLabelText('Current route')).toHaveTextContent('/pipeline'));
  expect(browserConfirm).not.toHaveBeenCalled();
});
it('confirms switching tabs through the frontend dialog', async () => {
  render(<MemoryRouter><UnsavedProvider><Form /></UnsavedProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Opportunity title'), { target: { value: 'Unsaved title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next tab' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Current tab')).toHaveTextContent('First');
  fireEvent.click(screen.getByRole('button', { name: 'Next tab' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.getByLabelText('Current tab')).toHaveTextContent('Second'));
});
