import { useState } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpportunityDetail, QuestionExtractionStatus } from '@xts/api-contracts';
import { newDraft } from '../lib/workflow';
import { RfpPreparation } from './RfpPreparation';

const api = vi.hoisted(() => ({ start: vi.fn(), status: vi.fn(), retry: vi.fn(), upload: vi.fn(), cancel: vi.fn(), source: vi.fn(), delay: vi.fn() }));
vi.mock('../services/QuestionExtractionService', async importOriginal => ({
  ...await importOriginal<typeof import('../services/QuestionExtractionService')>(),
  extractionEnabled: true,
  questionExtractionService: api,
  pollDelay: api.delay,
}));
beforeEach(() => { api.cancel.mockResolvedValue({ id: 'job-1', state: 'FAILED' }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });

const document = { id: '0b8a4c2e-1f3d-4a5b-9c6d-7e8f9a0b1c2d', name: 'questions.txt', downloadUrl: null };
const accepted = { document, jobId: 'job-1' };
const success: QuestionExtractionStatus = { id: 'job-1', state: 'SUCCEEDED', completed: 1, total: 1, error: null,
  questions: [{ id: 'extracted-1', text: 'Describe security controls.', sourceReference: 'Page 1 (b1)', validated: false }] };

async function mount() {
  function Harness() {
    const [form, setForm] = useState(() => {
      const form = newDraft('1'); form.rfp.type = 'QUESTIONNAIRE';
      form.rfp.questions = [{ id: 'manual-1', text: 'Existing manual question', sourceReference: '', validated: false }]; return form;
    });
    const [disabled, setDisabled] = useState(false);
    return <MockedProvider><><button onClick={() => setDisabled(value => !value)}>Toggle saving</button>
      <RfpPreparation form={form} setForm={setForm} disabled={disabled} />
      <output data-testid="form">{JSON.stringify(form)}</output></></MockedProvider>;
  }
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(<Harness />); });
  return view;
}
function select(name = 'questions.txt') {
  fireEvent.change(screen.getByLabelText('Source questionnaire'), { target: { files: [new File(['Describe security controls.'], name)] } });
}
async function upload() {
  api.upload.mockResolvedValue({ document });
  select();
  await screen.findByText(/Document uploaded/);
}
const instructionsToggle = () => screen.getByRole('button', { name: /extraction instructions/i });
// The instructions box is optional and hidden until its underline button is clicked.
function instructionsBox() {
  if (!screen.queryByLabelText('Extraction instructions')) fireEvent.click(instructionsToggle());
  return screen.getByLabelText('Extraction instructions');
}
const extractButton = () => screen.getByRole('button', { name: /^(Extract questions|Extracting\.\.\.)$/ });
const progress = () => screen.getByRole('status', { name: 'Extraction progress' });
const startExtraction = () => fireEvent.click(extractButton());
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

describe('prompt-driven question extraction', () => {
  it('uploads on file selection without extracting, and enables Extract only after upload', async () => {
    await mount();
    expect(screen.queryByRole('button', { name: /Suggest/ })).not.toBeInTheDocument();
    expect(extractButton()).toBeDisabled();
    expect(screen.queryByLabelText('Extraction instructions')).not.toBeInTheDocument();
    expect(instructionsToggle()).toHaveTextContent('+ Add extraction instructions');
    expect(instructionsToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(instructionsBox()).toHaveValue('');
    expect(instructionsToggle()).toHaveAttribute('aria-expanded', 'true');
    await upload();
    expect(screen.getByText('questions.txt')).toBeInTheDocument();
    expect(api.upload.mock.calls[0][0]).toBeInstanceOf(File);
    expect(api.start).not.toHaveBeenCalled();
    expect(api.retry).not.toHaveBeenCalled();
    expect(extractButton()).toBeEnabled();
    expect(screen.getByTestId('form').textContent).toContain(`"source":{"id":"${document.id}"`);
  });
  it('switches type and clears the document and questions without confirmation', async () => {
    await mount(); await upload();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /Generic RFP/ }));
    const form = JSON.parse(screen.getByTestId('form').textContent!);
    expect(form.rfp).toMatchObject({ type: 'GENERIC', source: null, questions: [], sections: [], extraction: null });
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByText('questions.txt')).not.toBeInTheDocument();
  });
  it('blocks type switching during an upload', async () => {
    const pending = deferred<{ document: typeof document }>();
    api.upload.mockReturnValue(pending.promise);
    await mount(); select();
    expect(screen.getByRole('button', { name: /Generic RFP/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Generic RFP/ }));
    expect(JSON.parse(screen.getByTestId('form').textContent!).rfp.type).toBe('QUESTIONNAIRE');
    await act(async () => pending.resolve({ document }));
    expect(screen.getByRole('button', { name: /Generic RFP/ })).toBeEnabled();
  });
  it('extracts all questions when no instructions are given', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue(success);
    await mount(); await upload();
    fireEvent.click(extractButton());
    await waitFor(() => expect(api.retry).toHaveBeenCalledWith(document.id, expect.any(String), expect.any(AbortSignal), ''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Extraction instructions')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
  });
  it('keeps typed instructions when the box is hidden and shows Edit on the button', async () => {
    await mount(); await upload();
    fireEvent.change(instructionsBox(), { target: { value: 'Extract: staffing questions.' } });
    fireEvent.click(instructionsToggle());
    expect(screen.queryByLabelText('Extraction instructions')).not.toBeInTheDocument();
    expect(instructionsToggle()).toHaveTextContent('Edit extraction instructions');
    api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue(success);
    fireEvent.click(extractButton());
    await waitFor(() => expect(api.retry).toHaveBeenCalledWith(document.id, expect.any(String), expect.any(AbortSignal), 'Extract: staffing questions.'));
  });
  it('rejects instructions too short to mean anything, without starting an extraction', async () => {
    await mount(); await upload();
    for (const tooShort of ['a', 'a b c d e f g h', 'aaaaaaaaaaaaaaaaaaaa']) {
      fireEvent.change(instructionsBox(), { target: { value: tooShort } });
      fireEvent.click(extractButton());
      expect(await screen.findByText(/Describe what to extract in a few words/)).toBeInTheDocument();
    }
    expect(api.retry).not.toHaveBeenCalled();
    fireEvent.change(instructionsBox(), { target: { value: 'pricing questions' } });
    expect(screen.queryByText(/Describe what to extract in a few words/)).not.toBeInTheDocument();
  });
  it('extracts with the written instructions, shows progress and keeps manual questions', async () => {
    const pending = deferred<QuestionExtractionStatus>();
    api.retry.mockResolvedValue(accepted); api.status.mockReturnValue(pending.promise);
    await mount(); await upload();
    fireEvent.change(instructionsBox(), { target: { value: 'Extract: security questions only.' } });
    startExtraction();
    await waitFor(() => expect(api.status).toHaveBeenCalled());
    expect(api.retry).toHaveBeenCalledWith(document.id, expect.any(String), expect.any(AbortSignal), 'Extract: security questions only.');
    expect(progress()).toHaveTextContent('%');
    expect(extractButton()).toBeDisabled();
    await act(async () => pending.resolve(success));
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Existing manual question');
    expect(progress()).toHaveTextContent('100%');
    expect(extractButton()).toBeEnabled();
  });
  it('reports a quota wait in the progress bar and shows completed questions before the job finishes', async () => {
    const pending = deferred<QuestionExtractionStatus>();
    api.retry.mockResolvedValue(accepted);
    api.status.mockResolvedValueOnce({ ...success, state: 'QUEUED', stage: 'RATE_LIMITED', retryAfterSeconds: 40, completed: 1, total: 2 })
      .mockReturnValueOnce(pending.promise);
    await mount(); await upload();
    startExtraction();
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
    expect(progress()).toHaveTextContent(/50%.*Waiting for the provider's available quota.*Retry in about 40 seconds/);
    await act(async () => pending.resolve({ ...success, completed: 2, total: 2 }));
    await waitFor(() => expect(progress()).toHaveTextContent('100%'));
  });
  it('re-extracts with an edited prompt, replacing earlier extracted questions after confirmation', async () => {
    api.retry.mockResolvedValueOnce(accepted).mockResolvedValueOnce({ ...accepted, jobId: 'job-2' });
    api.status.mockResolvedValueOnce(success)
      .mockResolvedValueOnce({ ...success, id: 'job-2', questions: [{ id: 'extracted-2', text: 'Provide a cost proposal.', sourceReference: 'Page 4 (b9)', validated: false }] });
    await mount(); await upload();
    startExtraction();
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
    fireEvent.change(instructionsBox(), { target: { value: 'Extract: pricing questions only.' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    startExtraction();
    await waitFor(() => expect(screen.getByLabelText('Question 2 text')).toHaveValue('Provide a cost proposal.'));
    expect(confirm).toHaveBeenCalled();
    expect(api.retry.mock.calls[1][3]).toBe('Extract: pricing questions only.');
    expect(screen.queryByDisplayValue('Describe security controls.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Existing manual question');
    expect(api.upload).toHaveBeenCalledTimes(1);
  });
  it('explains when no questions matched the instructions', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue({ ...success, questions: [] });
    await mount(); await upload();
    startExtraction();
    await waitFor(() => expect(progress()).toHaveTextContent('No questions matched these instructions. Try broader instructions.'));
    expect(screen.queryByLabelText('Question 2 text')).not.toBeInTheDocument();
  });
  it('keeps existing questions when extraction fails and allows extracting again', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue({ ...success, state: 'FAILED', error: 'AI_PROVIDER_UNAVAILABLE', questions: [] });
    await mount(); await upload();
    startExtraction();
    expect(await screen.findByText(/extraction provider is unavailable/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Existing manual question');
    await waitFor(() => expect(extractButton()).toBeEnabled());
  });
  it('defers applying results while a Save is in progress', async () => {
    const pending = deferred<QuestionExtractionStatus>(); api.retry.mockResolvedValue(accepted); api.status.mockReturnValue(pending.promise);
    await mount(); await upload();
    startExtraction();
    await waitFor(() => expect(api.status).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Toggle saving'));
    await act(async () => pending.resolve(success));
    expect(screen.queryByLabelText('Question 2 text')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle saving'));
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
  });
  it('does not restore a removed candidate when later progress repeats it', async () => {
    const pending = deferred<QuestionExtractionStatus>();
    api.retry.mockResolvedValue(accepted);
    api.status.mockResolvedValueOnce({ ...success, state: 'PROCESSING', stage: 'EXTRACTING', completed: 1, total: 2 }).mockReturnValueOnce(pending.promise);
    await mount(); await upload();
    startExtraction();
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Describe security controls.');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }));
    await act(async () => pending.resolve({ ...success, questions: [...success.questions,
      { id: 'extracted-2', text: 'Explain availability.', sourceReference: 'Page 4 (b9)', validated: false }] }));
    expect(await screen.findByLabelText('Question 2 text')).toHaveValue('Explain availability.');
    expect(screen.queryByDisplayValue('Describe security controls.')).not.toBeInTheDocument();
  });
  it('rejects an unsupported document without uploading it', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Source questionnaire'), { target: { files: [new File(['x'], 'notes.exe')] } });
    expect(screen.getByText(/Choose a non-empty PDF, Word, Excel \(\.xlsx\), CSV or text document/)).toBeInTheDocument();
    expect(api.upload).not.toHaveBeenCalled();
  });
  it('accepts Excel and CSV questionnaires and uploads them', async () => {
    await mount();
    expect(screen.getByLabelText('Source questionnaire')).toHaveAttribute('accept', '.pdf,.doc,.docx,.txt,.xlsx,.csv');
    api.upload.mockResolvedValue({ document: { ...document, name: 'questions.xlsx' } });
    fireEvent.change(screen.getByLabelText('Source questionnaire'), { target: { files: [new File(['x'], 'questions.xlsx')] } });
    await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Choose a non-empty/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source questionnaire'), { target: { files: [new File(['Question\nx'], 'questions.csv')] } });
    await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(2));
  });
  it('cancels the running extraction when the file is replaced', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockReturnValue(new Promise(() => {}));
    await mount(); await upload();
    startExtraction();
    await waitFor(() => expect(api.status).toHaveBeenCalled());
    select('replacement.txt');
    expect(api.cancel).toHaveBeenCalledWith(document.id, 'job-1');
    expect(api.cancel).toHaveBeenCalledTimes(1);
  });
  it('cancels the running extraction when the RFP type is switched', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockReturnValue(new Promise(() => {}));
    await mount(); await upload();
    startExtraction();
    await waitFor(() => expect(api.status).toHaveBeenCalled());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Generic RFP/ }));
    expect(api.cancel).toHaveBeenCalledWith(document.id, 'job-1');
  });
  it('cancels the running extraction when the form is left or the tab is closed', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockReturnValue(new Promise(() => {}));
    const view = await mount(); await upload();
    startExtraction();
    await waitFor(() => expect(api.status).toHaveBeenCalled());
    window.dispatchEvent(new Event('pagehide'));
    expect(api.cancel).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(api.cancel).toHaveBeenCalledTimes(1);
  });
  it('does not cancel an extraction that already finished', async () => {
    api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue(success);
    const view = await mount(); await upload();
    startExtraction();
    await screen.findByLabelText('Question 2 text');
    view.unmount();
    expect(api.cancel).not.toHaveBeenCalled();
  });
  describe('category tabs', () => {
    const categorized: QuestionExtractionStatus = { ...success, questions: [
      { id: 'extracted-a', text: 'Describe your hosting environment.', sourceReference: 'Page 9', validated: false, category: 'Technical', sourceOrder: 900 },
      { id: 'extracted-b', text: 'Provide a detailed cost proposal.', sourceReference: 'Page 11', validated: false, category: 'Pricing & Commercial', sourceOrder: 1100 },
      { id: 'extracted-c', text: 'Describe the technology platform.', sourceReference: 'Page 4', validated: false, category: 'Technical', sourceOrder: 400 },
    ] };
    const tab = (name: RegExp) => screen.getByRole('tab', { name });
    async function extractCategorized() {
      api.retry.mockResolvedValue(accepted); api.status.mockResolvedValue(categorized);
      await mount(); await upload();
      startExtraction();
      await screen.findByLabelText('Question 4 text');
    }
    it('shows underline tabs for categories present, with counts, and the list in a scrollable panel', async () => {
      await extractCategorized();
      const tabs = screen.getAllByRole('tab').map(element => element.textContent);
      expect(tabs).toEqual(['All (4)', 'Technical (2)', 'Pricing & Commercial (1)', 'Other (1)']);
      expect(tab(/^All/)).toHaveAttribute('data-state', 'active');
      expect(screen.getByRole('tablist', { name: 'Question categories' })).toHaveClass('opp-question-tabs');
      expect(screen.getByRole('region', { name: 'Extracted questions' })).toHaveClass('opp-question-panel');
      expect(screen.getByLabelText('Question 1 text')).toHaveValue('Existing manual question');
    });
    it('filters a tab to its questions in document order', async () => {
      await extractCategorized();
      fireEvent.mouseDown(tab(/^Technical/));
      await waitFor(() => expect(tab(/^Technical/)).toHaveAttribute('data-state', 'active'));
      expect(screen.getByLabelText('Question 1 text')).toHaveValue('Describe the technology platform.');
      expect(screen.getByLabelText('Question 2 text')).toHaveValue('Describe your hosting environment.');
      expect(screen.queryByLabelText('Question 3 text')).not.toBeInTheDocument();
    });
    it('adds a manual question into the open tab without moving the Add button', async () => {
      await extractCategorized();
      fireEvent.mouseDown(tab(/^Pricing/));
      await waitFor(() => expect(tab(/^Pricing/)).toHaveAttribute('data-state', 'active'));
      fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
      expect(tab(/^Pricing/)).toHaveTextContent('Pricing & Commercial (2)');
      expect(screen.getByLabelText('Question 2 text')).toHaveValue('');
      expect(screen.getByRole('button', { name: '+ Add question' }).closest('[role="region"]')).toBeNull();
    });
    it('falls back to All when the open tab becomes empty', async () => {
      await extractCategorized();
      fireEvent.mouseDown(tab(/^Pricing/));
      await waitFor(() => expect(tab(/^Pricing/)).toHaveAttribute('data-state', 'active'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }));
      await waitFor(() => expect(tab(/^All/)).toHaveAttribute('data-state', 'active'));
      expect(screen.queryByRole('tab', { name: /^Pricing/ })).not.toBeInTheDocument();
    });
  });
  it('aborts an in-flight upload when the component unmounts', async () => {
    api.upload.mockReturnValue(new Promise(() => {}));
    const view = await mount(); select();
    const signal = api.upload.mock.calls[0][2] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe('reopening a saved opportunity', () => {
  const restoredSource = {
    document: { id: '7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'rfp.pdf', downloadUrl: null },
    categories: [
      { text: 'Describe your hosting environment.', category: 'Technical', fromDocument: true },
      { text: 'Manual staffing question', category: 'Team', fromDocument: false },
    ],
  };
  async function mountSaved() {
    function Harness() {
      const [form, setForm] = useState(() => {
        const form = newDraft('1'); form.rfp.type = 'QUESTIONNAIRE';
        form.rfp.source = { id: 'rfp.pdf', name: 'rfp.pdf', downloadUrl: null };
        form.rfp.questions = [
          { id: 'saved-1', text: 'Describe your hosting environment.', sourceReference: '', validated: true },
          { id: 'saved-2', text: 'Manual staffing question', sourceReference: '', validated: true },
        ];
        return form;
      });
      return <MockedProvider><><RfpPreparation form={form} setForm={setForm} saved={{ id: '42' } as OpportunityDetail} disabled={false} />
        <output data-testid="form">{JSON.stringify(form)}</output></></MockedProvider>;
    }
    await act(async () => { render(<Harness />); });
  }
  it('restores category tabs and re-enables Extract without choosing the file again, without changing the form', async () => {
    api.source.mockResolvedValue(restoredSource);
    await mountSaved();
    expect(await screen.findByRole('tab', { name: 'Technical (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Team (1)' })).toBeInTheDocument();
    expect(api.source).toHaveBeenCalledWith('42');
    expect(screen.getByRole('button', { name: 'Extract questions' })).toBeEnabled();
    expect(screen.getByTestId('form').textContent).not.toContain('"category"');
  });
  it('re-extracting replaces questions that came from the document and keeps manual ones', async () => {
    api.source.mockResolvedValue(restoredSource);
    api.retry.mockResolvedValue({ document: restoredSource.document, jobId: 'job-9' });
    api.status.mockResolvedValue({ id: 'job-9', state: 'SUCCEEDED', completed: 1, total: 1, error: null,
      questions: [{ id: 'extracted-9', text: 'Describe your hosting and security approach.', sourceReference: 'Page 3', validated: false, category: 'Technical' }] });
    await mountSaved();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Extract questions' })).toBeEnabled());
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Extract questions' }));
    await waitFor(() => expect(screen.getByDisplayValue('Describe your hosting and security approach.')).toBeInTheDocument());
    expect(confirm).toHaveBeenCalled();
    expect(api.retry).toHaveBeenCalledWith(restoredSource.document.id, expect.any(String), expect.any(AbortSignal), '');
    expect(screen.queryByDisplayValue('Describe your hosting environment.')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Manual staffing question')).toBeInTheDocument();
  });
  it('still works when nothing was stored for the opportunity', async () => {
    api.source.mockRejectedValue(new Error('offline'));
    await mountSaved();
    await waitFor(() => expect(api.source).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Extract questions' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Other (2)' })).toBeInTheDocument();
  });
});
