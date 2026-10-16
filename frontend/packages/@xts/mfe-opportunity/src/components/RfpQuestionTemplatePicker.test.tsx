import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RfpQuestion } from '@xts/api-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET_RFP_QUESTION_TEMPLATES } from '../services/rfpQuestion.queries';
import { RfpQuestionTemplatePicker } from './RfpQuestionTemplatePicker';

afterEach(cleanup);

function question(id: number, text: string, isActive = true, displayOrder: number | null = id): RfpQuestion {
  return { id, question: text, description: null, displayOrder, isActive, createdDt: null, updatedDt: null };
}

function response(questions: (RfpQuestion | null)[] | null): MockedResponse {
  return { request: { query: GET_RFP_QUESTION_TEMPLATES }, result: { data: { rfpQuestionsList: questions } } };
}

describe('Question Master selection', () => {
  it('reads only after opening and excludes inactive/null masters while preventing duplicates', async () => {
    const fetchResult = vi.fn(() => ({ data: { rfpQuestionsList: [
      question(2, 'Existing question'), question(3, 'Inactive question', false), null, question(1, 'Available question'),
    ] } }));
    const onAdd = vi.fn();
    render(<MockedProvider mocks={[{ request: { query: GET_RFP_QUESTION_TEMPLATES }, result: fetchResult }]}>
      <RfpQuestionTemplatePicker alreadySelectedIds={[2]} onAdd={onAdd} />
    </MockedProvider>);
    expect(fetchResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    const available = await screen.findByRole('checkbox', { name: 'Available question' });
    expect(screen.queryByRole('checkbox', { name: 'Inactive question' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Existing question' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Existing question' })).toBeChecked();
    fireEvent.click(available);
    fireEvent.click(screen.getByRole('button', { name: 'Add selected questions' }));
    expect(onAdd).toHaveBeenCalledWith([question(1, 'Available question')]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps selected records through searches and returns the real master identifiers', async () => {
    const records = [question(40, 'Delivery experience'), { ...question(60, 'Security controls'), description: 'Compliance certification' }];
    const onAdd = vi.fn();
    render(<MockedProvider mocks={[response(records)]}><RfpQuestionTemplatePicker onAdd={onAdd} /></MockedProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Delivery experience' }));
    fireEvent.change(screen.getByLabelText('Search master questions'), { target: { value: 'certification' } });
    expect(screen.queryByRole('checkbox', { name: 'Delivery experience' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Security controls' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected questions' }));
    expect(onAdd).toHaveBeenCalledWith(records);
  });

  it('reports a read failure and recovers through retry instead of showing a false empty catalog', async () => {
    const mocks: MockedResponse[] = [
      { request: { query: GET_RFP_QUESTION_TEMPLATES }, error: new Error('Master service unavailable') },
      response([question(8, 'Recovered question')]),
    ];
    render(<MockedProvider mocks={mocks}><RfpQuestionTemplatePicker onAdd={vi.fn()} /></MockedProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Master service unavailable');
    expect(screen.queryByText('No active master questions are available.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add selected questions' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('checkbox', { name: 'Recovered question' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty catalog only after a successful response with no active questions', async () => {
    render(<MockedProvider mocks={[response([question(1, 'Disabled template', false)])]}>
      <RfpQuestionTemplatePicker onAdd={vi.fn()} />
    </MockedProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    expect(await screen.findByText('No active master questions are available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add selected questions' })).toBeDisabled();
  });

  it('distinguishes a search with no matches from an empty master catalog', async () => {
    render(<MockedProvider mocks={[response([question(1, 'Existing template')])]}>
      <RfpQuestionTemplatePicker onAdd={vi.fn()} />
    </MockedProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    await screen.findByRole('checkbox', { name: 'Existing template' });
    fireEvent.change(screen.getByLabelText('Search master questions'), { target: { value: 'unmatched search' } });
    expect(screen.getByText('No master questions match your search.')).toBeInTheDocument();
    expect(screen.queryByText('No active master questions are available.')).not.toBeInTheDocument();
  });

  it('keeps the trigger disabled when opportunity edits are unavailable', () => {
    render(<MockedProvider mocks={[]}><RfpQuestionTemplatePicker disabled onAdd={vi.fn()} /></MockedProvider>);
    expect(screen.getByRole('button', { name: 'Add from Question Master' })).toBeDisabled();
  });

  it('treats a null master list as unavailable and retries', async () => {
    render(<MockedProvider mocks={[response(null), response([question(9, 'Recovered template')])]}>
      <RfpQuestionTemplatePicker onAdd={vi.fn()} />
    </MockedProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add from Question Master' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Question Master returned no question data. Please retry.');
    expect(screen.queryByText('No active master questions are available.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add selected questions' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('checkbox', { name: 'Recovered template' })).toBeInTheDocument();
  });
});
