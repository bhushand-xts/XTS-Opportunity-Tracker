import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { OpportunityDetail, Scope } from '@xts/api-contracts';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { ScopeModule } from './PreparationModules';

afterEach(cleanup);
const empty = (): Scope => ({ revision: 0, summary: '', risks: [], alignment: [] });
function mount(scope = empty(), stageId = 3) {
  let stored = scope;
  const initial = fixtureOpportunity({ stageId, subStageId: stageId === 3 ? 7 : 8, scope, allowedActions: ['EDIT_SCOPE'] });
  const saveScope = vi.fn(async (command: Parameters<typeof productionOpportunityService.saveScope>[0]): Promise<OpportunityDetail> => {
    stored = { ...stored, revision: stored.revision + 1,
      ...(command.section === 'SCOPE' ? { summary: command.scope.summary.trim() } : {}),
      ...(command.section === 'RISKS' ? { risks: command.scope.risks.map((item, index) => ({ ...item, id: item.id.startsWith('draft-') ? String(index + 1) : item.id })) } : {}),
      ...(command.section === 'ALIGNMENT' ? { alignment: command.scope.alignment.map((item, index) => ({ ...item, id: item.id.startsWith('draft-') ? String(index + 1) : item.id })) } : {}),
    };
    return { ...initial, scope: stored };
  });
  function Workspace() {
    const [opportunity, setOpportunity] = useState<OpportunityDetail>(initial);
    return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}><ScopeModule opportunity={opportunity} onSaved={setOpportunity} readOnly={false} /></OpportunityServiceContext.Provider>;
  }
  return { ...render(<Workspace />), saveScope };
}
function count(label: string) {
  const summary = within(screen.getByRole('complementary', { name: 'Assessment summary' }));
  return summary.getByText(label).parentElement!.querySelector('strong')!.textContent;
}
function riskPanel() { return within(screen.getByRole('textbox', { name: 'Add risk' }).closest('.opp-panel')!); }
function alignmentPanel() { return within(screen.getByRole('textbox', { name: 'Add alignment item' }).closest('.opp-panel')!); }

it('keeps scope saving independent and saves risks directly through Add without a separate Save button', async () => {
  const h = mount();
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: 'Project scope' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'Access delay' } });
  expect(screen.queryByRole('button', { name: 'Save risks' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save alignment' })).not.toBeInTheDocument();
  expect(count('Risks')).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Save scope' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save scope' })).toBeDisabled());
  expect(h.saveScope).toHaveBeenCalledWith(expect.objectContaining({ section: 'SCOPE', scope: expect.objectContaining({ revision: 0, summary: 'Project scope' }) }));
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('Access delay');
  expect(count('Risks')).toBe('0');
  fireEvent.click(riskPanel().getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(count('Risks')).toBe('1'));
  expect(count('High risk')).toBe('1');
  expect(screen.getByRole('textbox', { name: 'Risk description 1' })).toHaveValue('Access delay');
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('');
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'RISKS', scope: expect.objectContaining({ revision: 1 }) }));
});

it('saves alignment directly through Add without requiring an unrelated unsaved scope', async () => {
  const h = mount();
  fireEvent.change(screen.getByRole('textbox', { name: 'Add alignment item' }), { target: { value: 'Client platform' } });
  expect(count('Alignment')).toBe('0');
  fireEvent.click(alignmentPanel().getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(count('Alignment')).toBe('1'));
  expect(h.saveScope).toHaveBeenCalledWith(expect.objectContaining({ section: 'ALIGNMENT', scope: expect.objectContaining({ alignment: [expect.objectContaining({ text: 'Client platform' })] }) }));
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: 'Alignment item 1' })).toHaveValue('Client platform');
});

it('updates a risk beside its row, updates alignment, and persists removals immediately', async () => {
  const h = mount({ revision: 3, summary: 'Saved scope', risks: [{ id: '21', description: 'Delay', severity: 'LOW' }], alignment: [{ id: '31', text: 'Old platform' }] });
  fireEvent.change(screen.getByRole('textbox', { name: 'Risk description 1' }), { target: { value: 'Updated delay' } });
  const update = riskPanel().getByRole('button', { name: 'Update risk 1' });
  expect(update.closest('li')).toContainElement(screen.getByRole('textbox', { name: 'Risk description 1' }));
  fireEvent.click(update);
  await waitFor(() => expect(riskPanel().queryByRole('button', { name: 'Update risk 1' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenCalledWith(expect.objectContaining({ scope: expect.objectContaining({ risks: [{ id: '21', description: 'Updated delay', severity: 'LOW' }] }) }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Alignment item 1' }), { target: { value: 'New platform' } });
  const alignmentUpdate = alignmentPanel().getByRole('button', { name: 'Update alignment 1' });
  expect(alignmentUpdate.closest('li')).toContainElement(screen.getByRole('textbox', { name: 'Alignment item 1' }));
  fireEvent.click(alignmentUpdate);
  await waitFor(() => expect(alignmentPanel().queryByRole('button', { name: 'Update alignment 1' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ scope: expect.objectContaining({ alignment: [{ id: '31', text: 'New platform' }] }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Updated delay' }));
  expect(count('Risks')).toBe('1');
  await waitFor(() => expect(count('Risks')).toBe('0'));
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'RISKS', scope: expect.objectContaining({ risks: [] }) }));
});

it('updating or adding a risk leaves other risk drafts and the pending new input untouched', async () => {
  const h = mount({ revision: 3, summary: 'Scope', risks: [
    { id: '21', description: 'First risk', severity: 'LOW' },
    { id: '22', description: 'Second risk', severity: 'HIGH' },
  ], alignment: [] });
  fireEvent.change(screen.getByRole('textbox', { name: 'Risk description 1' }), { target: { value: 'First draft' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Risk description 2' }), { target: { value: 'Second update' } });
  expect(riskPanel().getByRole('button', { name: 'Add' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'Pending third risk' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update risk 2' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Update risk 2' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ scope: expect.objectContaining({ risks: [
    { id: '21', description: 'First risk', severity: 'LOW' },
    { id: '22', description: 'Second update', severity: 'HIGH' },
  ] }) }));
  expect(screen.getByRole('textbox', { name: 'Risk description 1' })).toHaveValue('First draft');
  expect(screen.getByRole('button', { name: 'Update risk 1' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('Pending third risk');
  fireEvent.click(riskPanel().getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(count('Risks')).toBe('3'));
  expect(screen.getByRole('textbox', { name: 'Risk description 1' })).toHaveValue('First draft');
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Update risk 1' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Update risk 1' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Update risk 1' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ scope: expect.objectContaining({ revision: 5, risks: expect.arrayContaining([expect.objectContaining({ id: '21', description: 'First draft' })]) }) }));
});

it('keeps the edited risk and its Update button available after a failed update', async () => {
  const h = mount({ revision: 1, summary: 'Scope', risks: [{ id: '21', description: 'Saved risk', severity: 'HIGH' }], alignment: [] });
  h.saveScope.mockRejectedValueOnce(new Error('History unavailable.'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Risk description 1' }), { target: { value: 'Edited risk' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update risk 1' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
  expect(screen.getByRole('textbox', { name: 'Risk description 1' })).toHaveValue('Edited risk');
  expect(screen.getByRole('button', { name: 'Update risk 1' })).toBeEnabled();
  expect(count('Risks')).toBe('1');
});

it('updates only the chosen alignment item and keeps other drafts while adding a new item', async () => {
  const h = mount({ revision: 3, summary: 'Scope', risks: [], alignment: [
    { id: '31', text: 'First alignment' }, { id: '32', text: 'Second alignment' },
  ] });
  fireEvent.change(screen.getByRole('textbox', { name: 'Alignment item 1' }), { target: { value: 'First draft' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Alignment item 2' }), { target: { value: 'Second update' } });
  expect(alignmentPanel().getByRole('button', { name: 'Add' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Add alignment item' }), { target: { value: 'Pending third alignment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update alignment 2' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Update alignment 2' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'ALIGNMENT', scope: expect.objectContaining({ alignment: [
    { id: '31', text: 'First alignment' }, { id: '32', text: 'Second update' },
  ] }) }));
  expect(screen.getByRole('textbox', { name: 'Alignment item 1' })).toHaveValue('First draft');
  expect(screen.getByRole('button', { name: 'Update alignment 1' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toHaveValue('Pending third alignment');
  fireEvent.click(alignmentPanel().getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(count('Alignment')).toBe('3'));
  expect(screen.getByRole('textbox', { name: 'Alignment item 1' })).toHaveValue('First draft');
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Update alignment 1' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Update alignment 1' })).not.toBeInTheDocument());
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ scope: expect.objectContaining({ revision: 5, alignment: expect.arrayContaining([{ id: '31', text: 'First draft' }]) }) }));
});

it('preserves an edited alignment and offers its Update button again when saving fails', async () => {
  const h = mount({ revision: 1, summary: 'Scope', risks: [], alignment: [{ id: '31', text: 'Saved alignment' }] });
  h.saveScope.mockRejectedValueOnce(new Error('History unavailable.'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Alignment item 1' }), { target: { value: 'Edited alignment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update alignment 1' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
  expect(screen.getByRole('textbox', { name: 'Alignment item 1' })).toHaveValue('Edited alignment');
  expect(screen.getByRole('button', { name: 'Update alignment 1' })).toBeEnabled();
  expect(count('Alignment')).toBe('1');
});

it('preserves failed drafts and keeps summary counts unchanged', async () => {
  const h = mount();
  h.saveScope.mockRejectedValueOnce(new Error('The saved assessment has changed. Refresh before saving.'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'Draft risk' } });
  fireEvent.click(riskPanel().getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('has changed');
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('Draft risk');
  expect(count('Risks')).toBe('0');
  expect(riskPanel().getByRole('button', { name: 'Add' })).toBeEnabled();
  fireEvent.click(riskPanel().getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(count('Risks')).toBe('1'));
  expect(screen.getAllByRole('textbox', { name: /Risk description/ })).toHaveLength(1);
});

it('removing an item does not save or discard the pending new item', async () => {
  const h = mount({ revision: 1, summary: '', risks: [{ id: '21', description: 'Existing risk', severity: 'HIGH' }], alignment: [] });
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'Pending new risk' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Existing risk' }));
  await waitFor(() => expect(count('Risks')).toBe('0'));
  expect(h.saveScope).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'RISKS', scope: expect.objectContaining({ risks: [] }) }));
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('Pending new risk');
});

it('keeps a saved item and its count visible if removal fails', async () => {
  const h = mount({ revision: 1, summary: '', risks: [], alignment: [{ id: '31', text: 'Existing alignment' }] });
  h.saveScope.mockRejectedValueOnce(new Error('History unavailable.'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Existing alignment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
  expect(count('Alignment')).toBe('1');
  expect(screen.getByRole('textbox', { name: 'Alignment item 1' })).toHaveValue('Existing alignment');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Existing alignment' }));
  await waitFor(() => expect(count('Alignment')).toBe('0'));
});

it('saves through Enter and prevents duplicate submissions while adding', async () => {
  const h = mount();
  let finish!: (value: OpportunityDetail) => void;
  h.saveScope.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const field = screen.getByRole('textbox', { name: 'Add alignment item' });
  fireEvent.change(field, { target: { value: 'Client platform' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(h.saveScope).toHaveBeenCalledOnce();
  expect(alignmentPanel().getByRole('button', { name: 'Add' })).toBeDisabled();
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(h.saveScope).toHaveBeenCalledOnce();
  expect(count('Alignment')).toBe('0');
  finish(fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['EDIT_SCOPE'], scope: { revision: 1, summary: '', risks: [], alignment: [{ id: '31', text: 'Client platform' }] } }));
  await waitFor(() => expect(count('Alignment')).toBe('1'));
  expect(field).toHaveValue('');
});

it.each([1, 2, 4, 5, 6])('keeps assessment editing unavailable outside engineering estimation at stage %s', stageId => {
  const h = mount(empty(), stageId);
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save scope' })).not.toBeInTheDocument();
  expect(h.saveScope).not.toHaveBeenCalled();
});

it('makes clearing a saved scope an explicit removal while preserving unrelated items and pending input', async () => {
  const h = mount({ revision: 3, summary: 'Saved scope', risks: [{ id: '21', description: 'Existing risk', severity: 'HIGH' }], alignment: [{ id: '31', text: 'Client platform' }] });
  fireEvent.change(screen.getByRole('textbox', { name: 'Add alignment item' }), { target: { value: 'Pending alignment' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove scope' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save scope' })).toBeDisabled());
  expect(h.saveScope).toHaveBeenCalledWith(expect.objectContaining({ section: 'SCOPE', scope: expect.objectContaining({ summary: '' }) }));
  expect(count('Risks')).toBe('1');
  expect(count('Alignment')).toBe('1');
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toHaveValue('Pending alignment');
});

it.each(['risk', 'alignment'] as const)('blocks adding a duplicate %s while preserving the input and saved counts', kind => {
  const h = mount({ revision: 3, summary: 'Saved scope', risks: [{ id: '21', description: 'Access delay', severity: 'LOW' }], alignment: [{ id: '31', text: 'Client platform' }] });
  const field = screen.getByRole('textbox', { name: kind === 'risk' ? 'Add risk' : 'Add alignment item' });
  const text = kind === 'risk' ? ' ACCESS   delay ' : ' CLIENT   platform ';
  fireEvent.change(field, { target: { value: text } });
  fireEvent.click((kind === 'risk' ? riskPanel() : alignmentPanel()).getByRole('button', { name: 'Add' }));
  const hint = (kind === 'risk' ? riskPanel() : alignmentPanel()).getByRole('alert');
  expect(hint).toHaveTextContent(`This ${kind === 'risk' ? 'risk' : 'alignment item'} is already listed.`);
  expect(hint).toHaveTextContent('or edit the existing one.');
  expect(screen.queryByText('Unable to complete this action')).not.toBeInTheDocument();
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(field).toHaveAttribute('aria-describedby', hint.id);
  expect(h.saveScope).not.toHaveBeenCalled();
  expect(field).toHaveValue(text);
  expect(count(kind === 'risk' ? 'Risks' : 'Alignment')).toBe('1');
  fireEvent.change(field, { target: { value: 'A different entry' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(field).not.toHaveAttribute('aria-invalid');
});

it.each(['risk', 'alignment'] as const)('blocks updating a %s to another saved description and allows correcting the draft', async kind => {
  const h = mount({ revision: 3, summary: 'Saved scope',
    risks: [{ id: '21', description: 'Access delay', severity: 'LOW' }, { id: '22', description: 'Schedule', severity: 'HIGH' }],
    alignment: [{ id: '31', text: 'Client platform' }, { id: '32', text: 'Standards' }],
  });
  const field = screen.getByRole('textbox', { name: kind === 'risk' ? 'Risk description 2' : 'Alignment item 2' });
  fireEvent.change(field, { target: { value: kind === 'risk' ? ' ACCESS  delay ' : ' CLIENT  platform ' } });
  fireEvent.click(screen.getByRole('button', { name: kind === 'risk' ? 'Update risk 2' : 'Update alignment 2' }));
  expect((kind === 'risk' ? riskPanel() : alignmentPanel()).getByRole('alert')).toHaveTextContent('is already listed.');
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(h.saveScope).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: 'Corrected description' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: kind === 'risk' ? 'Update risk 2' : 'Update alignment 2' }));
  await waitFor(() => expect(h.saveScope).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(count(kind === 'risk' ? 'Risks' : 'Alignment')).toBe('2');
});

it('allows removing a pre-existing duplicate without discarding unrelated input', async () => {
  const h = mount({ revision: 3, summary: 'Saved scope',
    risks: [{ id: '21', description: 'Access delay', severity: 'LOW' }, { id: '22', description: 'ACCESS  delay', severity: 'HIGH' }],
    alignment: [],
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'Pending risk' } });
  fireEvent.click(screen.getByRole('button', { name: /Remove ACCESS\s+delay/ }));
  await waitFor(() => expect(count('Risks')).toBe('1'));
  expect(h.saveScope).toHaveBeenCalledOnce();
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toHaveValue('Pending risk');
});
