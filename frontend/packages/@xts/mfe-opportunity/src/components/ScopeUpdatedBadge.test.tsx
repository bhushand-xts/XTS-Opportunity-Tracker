import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { ScopeModule } from './PreparationModules';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([
  { section: 'Alignment', other: 'Risks', text: 'Alignment text', input: 'Edit alignment item: Alignment text', field: 'alignment' },
  { section: 'Risks', other: 'Alignment', text: 'Risk text', input: 'Edit risk: Risk text', field: 'risks' },
] as const)('shows Updated only in $section when a row ID is shared with $other', async ({ section, other, text, input, field }) => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const opportunity = fixtureOpportunity({
    stageId: 3, subStageId: 7, allowedActions: ['EDIT_SCOPE'],
    scope: { revision: 1, summary: 'Scope', alignment: [{ id: '1', text: 'Alignment text' }], risks: [{ id: '1', description: 'Risk text', severity: 'HIGH' }] },
  });
  const saveScope = vi.fn(async (command: Parameters<typeof productionOpportunityService.saveScope>[0]) => ({
    ...opportunity, scope: { ...command.scope, revision: 2 },
  }));
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}>
    <ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} />
  </OpportunityServiceContext.Provider>);
  const changedPanel = screen.getByText(section, { selector: 'div' }).closest('.opp-panel') as HTMLElement;
  const otherPanel = screen.getByText(other, { selector: 'div' }).closest('.opp-panel') as HTMLElement;
  fireEvent.doubleClick(within(changedPanel).getByText(text));
  const editor = screen.getByRole('textbox', { name: input });
  fireEvent.change(editor, { target: { value: `${text} updated` } });
  fireEvent.keyDown(editor, { key: 'Enter' });

  await waitFor(() => expect(saveScope).toHaveBeenCalledOnce());
  await waitFor(() => expect(within(changedPanel).getByText(`${text} updated`)).toBeVisible());
  expect(within(changedPanel).getByText('Updated')).toBeVisible();
  expect(within(otherPanel).queryByText('Updated')).not.toBeInTheDocument();
  expect(saveScope.mock.calls[0][0].scope[field][0].id).toBe('1');
});
