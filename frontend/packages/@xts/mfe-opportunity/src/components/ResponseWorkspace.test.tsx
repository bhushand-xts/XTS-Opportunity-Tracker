import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { OpportunityDetail, ResponseItem } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { UnsavedProvider } from '../hooks/useUnsaved';
import { ResponseWorkspace } from './ResponseWorkspace';

afterEach(cleanup);

function response(id: string, title: string, editable = true): ResponseItem {
  return { id, title, answer: '', revision: 1, state: 'UNASSIGNED', sourceValidated: true, sourceReference: 'Technical',
    owner: null, reviewer: null, dueDate: null, submittedRevision: null, approvedRevision: null, reviewComment: null,
    allowedActions: editable ? ['SAVE_ANSWER'] : [] };
}

function mount({ editable = true, readOnly = false, questionnaire = false, answer = vi.fn(), responses }: {
  editable?: boolean; readOnly?: boolean; questionnaire?: boolean; answer?: ReturnType<typeof vi.fn>; responses?: ResponseItem[];
} = {}) {
  const base = fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: [], responses: responses ?? [
    response('71', 'Describe your delivery approach.', editable),
    { ...response('72', 'Describe security controls.', editable), answer: 'Encrypted storage.' },
  ] });
  const type = questionnaire ? 'QUESTIONNAIRE' : 'GENERIC';
  const initial: OpportunityDetail = { ...base, rfpType: type, form: { ...base.form, rfp: { ...base.form.rfp, type } } };
  const onSaved = vi.fn();
  function Workspace() {
    const [opportunity, setOpportunity] = useState(initial);
    return <ResponseWorkspace opportunity={opportunity} readOnly={readOnly} onSaved={saved => { onSaved(saved); setOpportunity(saved); }} />;
  }
  const view = render(<MemoryRouter><UnsavedProvider><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, answer }}>
    <Workspace />
  </OpportunityServiceContext.Provider></UnsavedProvider></MemoryRouter>);
  return { ...view, initial, answer, onSaved };
}

describe('opportunity question answers', () => {
  it('shows opportunity questions and free-text answers without any assignment or review controls', async () => {
    mount();
    expect(screen.getByText('2 questions saved for this opportunity')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Technical questions' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Answer' })).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save answer' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /assign|review/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Answer owner')).not.toBeInTheDocument();
    expect(screen.queryByText('Independent reviewer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Describe security controls/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Encrypted storage.'));
  });

  it('saves an unassigned question directly and shows the persisted answer', async () => {
    const h = mount();
    const text = 'Phase 1: discovery.\nPhase 2: delivery.';
    h.answer.mockResolvedValue({ ...h.initial, responses: h.initial.responses!.map(item => item.id === '71' ? { ...item, answer: text, revision: 2 } : item) });
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    await waitFor(() => expect(h.onSaved).toHaveBeenCalledOnce());
    expect(h.answer).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: h.initial.id, responseId: '71', responseRevision: 1, answer: text, submit: false }));
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue(text);
    expect(screen.getByRole('button', { name: 'Save answer' })).toBeDisabled();
    expect(screen.getAllByText('Answered')).toHaveLength(2);
  });

  it('groups extracted questionnaire questions by category and saves duplicate question text to its selected row', async () => {
    const h = mount({ questionnaire: true, responses: [
      { ...response('71', 'Describe the approach.'), category: 'Technical' },
      { ...response('72', 'Describe the approach.'), category: 'Security' },
      { ...response('73', 'Additional details?'), category: '  ', sourceReference: null },
    ] });
    expect(within(screen.getByRole('region', { name: 'Technical questions' })).getByRole('button', { name: /Describe the approach/ })).toHaveAttribute('aria-pressed', 'true');
    const categories = within(screen.getByRole('group', { name: 'Question categories' }));
    expect(categories.getAllByRole('button')).toHaveLength(3);
    expect(categories.getByRole('button', { name: /Technical/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('region', { name: 'Security questions' })).not.toBeInTheDocument();
    fireEvent.click(categories.getByRole('button', { name: /Other/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Other questions' })).toHaveTextContent('Additional details?'));
    fireEvent.click(categories.getByRole('button', { name: /Security/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Security questions' })).toBeVisible());
    expect(screen.queryByRole('region', { name: 'Technical questions' })).not.toBeInTheDocument();
    const selected = within(screen.getByRole('region', { name: 'Security questions' })).getByRole('button', { name: /Describe the approach/ });
    await waitFor(() => expect(selected).toHaveAttribute('aria-pressed', 'true'));
    const text = 'Security-specific answer.';
    h.answer.mockResolvedValue({ ...h.initial, responses: h.initial.responses!.map(item => item.id === '72' ? { ...item, answer: text, revision: 2 } : item) });
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    await waitFor(() => expect(h.onSaved).toHaveBeenCalledOnce());
    expect(h.answer).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: h.initial.id, responseId: '72', answer: text }));
    fireEvent.click(categories.getByRole('button', { name: /Technical/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue(''));
  });

  it('protects an unsaved answer when switching categories and shows only the chosen questions after discarding', async () => {
    mount({ questionnaire: true, responses: [
      { ...response('71', 'Delivery approach?'), category: 'Technical' },
      { ...response('72', 'Security controls?'), category: 'Security' },
    ] });
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: 'Unsaved technical answer.' } });
    const security = within(screen.getByRole('group', { name: 'Question categories' })).getByRole('button', { name: /Security/ });
    fireEvent.click(security);
    expect(await screen.findByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Unsaved technical answer.');
    expect(security).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(security);
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(security).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('region', { name: 'Technical questions' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Security questions' })).toHaveTextContent('Security controls?');
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('');
  });

  it('updates a saved answer using the new question revision', async () => {
    const h = mount();
    for (const [text, revision] of [['First answer.', 2], ['Updated answer.', 3]] as const) {
      h.answer.mockResolvedValueOnce({ ...h.initial, responses: h.initial.responses!.map(item => item.id === '71' ? { ...item, answer: text, revision } : item) });
      fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
      await waitFor(() => expect(h.onSaved).toHaveBeenCalledTimes(revision - 1));
      expect(h.answer).toHaveBeenLastCalledWith(expect.objectContaining({ responseId: '71', responseRevision: revision - 1, answer: text }));
    }
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Updated answer.');
  });

  it.each([{ editable: false, readOnly: false }, { editable: true, readOnly: true }])('shows read-only answers when edit access is unavailable: %j', async options => {
    const h = mount(options);
    const field = screen.getByRole('textbox', { name: 'Answer' });
    expect(field).toHaveAttribute('readonly');
    fireEvent.change(field, { target: { value: 'Unauthorized change' } });
    expect(screen.queryByRole('button', { name: 'Save answer' })).not.toBeInTheDocument();
    expect(h.answer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Describe security controls/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Encrypted storage.'));
  });

  it('preserves the answer when saving fails', async () => {
    const h = mount();
    h.answer.mockRejectedValue(new Error('This answer has changed. Refresh before saving.'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: 'My answer draft.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This answer has changed.');
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('My answer draft.');
    expect(h.onSaved).not.toHaveBeenCalled();
  });

  it('warns before changing questions with an unsaved answer', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: 'Unsaved delivery answer.' } });
    fireEvent.click(screen.getByRole('button', { name: /Describe security controls/ }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Unsaved delivery answer.');
  });

  it('keeps the original revision when newer server data arrives during editing', async () => {
    const answer = vi.fn().mockRejectedValue(new Error('Refresh before saving.'));
    const initial = fixtureOpportunity({ responses: [response('71', 'Delivery?')] });
    const renderWorkspace = (opportunity: OpportunityDetail) => <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, answer }}>
      <ResponseWorkspace opportunity={opportunity} onSaved={vi.fn()} />
    </OpportunityServiceContext.Provider>;
    const view = render(renderWorkspace(initial));
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: 'My draft.' } });
    view.rerender(renderWorkspace({ ...initial, responses: [{ ...initial.responses![0], revision: 2, answer: 'Another team member’s answer.' }] }));
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('My draft.');
    fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    await waitFor(() => expect(answer).toHaveBeenCalledWith(expect.objectContaining({ responseRevision: 1, answer: 'My draft.' })));
  });
});
