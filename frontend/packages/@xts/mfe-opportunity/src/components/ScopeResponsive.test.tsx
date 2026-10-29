import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { ScopeModule } from './PreparationModules';
import type { OpportunityDetail } from '@xts/api-contracts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(readOnly = false, overrides: Partial<OpportunityDetail> = {}) {
  let resizeLayout: (width: number) => void = () => {};
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      if (target.classList.contains('opp-assessment-layout')) {
        resizeLayout = width => this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
    }
    unobserve() {}
    disconnect() {}
  });
  const saveScope = vi.fn();
  const opportunity = fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['EDIT_SCOPE'], scope: { revision: 1, summary: 'Saved scope', alignment: [], risks: [] }, ...overrides });
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}>
    <ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={readOnly} />
  </OpportunityServiceContext.Provider>);
  return { resize: (width: number) => act(() => resizeLayout(width)), saveScope };
}

it('collapses only in narrow workspaces and keeps unsaved inputs when toggled or resized', () => {
  const { resize, saveScope } = mount();
  resize(1200);
  expect(screen.queryByRole('button', { name: /^(Expand|Collapse) (scope|alignment|risks)$/ })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeVisible();

  resize(800);
  for (const section of ['scope', 'alignment', 'risks']) {
    expect(screen.getByRole('button', { name: `Expand ${section}` })).toHaveAttribute('aria-expanded', 'false');
  }
  expect(screen.queryByRole('textbox', { name: 'Scope summary' })).not.toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: 'Assessment summary' })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Expand scope' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: 'Unsaved draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Collapse scope' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand scope' }));
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toHaveValue('Unsaved draft');

  fireEvent.click(screen.getByRole('button', { name: 'Expand alignment' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Add alignment item' }), { target: { value: 'Pending alignment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Collapse alignment' }));
  resize(1200);
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toHaveValue('Pending alignment');
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toHaveValue('Unsaved draft');
  expect(screen.queryByRole('button', { name: /^(Expand|Collapse) (scope|alignment|risks)$/ })).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});

it('allows responsive expansion without enabling edits for read-only users', () => {
  const { resize, saveScope } = mount(true);
  resize(800);
  fireEvent.click(screen.getByRole('button', { name: 'Expand scope' }));
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Expand risks' }));
  expect(screen.queryByRole('textbox', { name: 'Add risk' })).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});

it('keeps incoming duplicate checks and hints after expanding the responsive panels', () => {
  const { resize, saveScope } = mount(false, { scope: { revision: 1, summary: 'Saved scope', alignment: [{ id: 'a1', text: 'Platform fit' }], risks: [{ id: 'r1', description: 'Access delay', severity: 'HIGH' }] } });
  resize(800);
  for (const [section, label, duplicate] of [['alignment', 'Add alignment item', 'Platform fit'], ['risks', 'Add risk', 'Access delay']]) {
    fireEvent.click(screen.getByRole('button', { name: `Expand ${section}` }));
    const input = screen.getByRole('textbox', { name: label });
    fireEvent.change(input, { target: { value: duplicate } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const panel = input.closest('.opp-panel')!;
    expect(within(panel as HTMLElement).getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(document.getElementById(input.getAttribute('aria-describedby')!)).toBeVisible();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saveScope).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Unique description' } });
    expect(input).toHaveAttribute('aria-invalid', 'false');
  }
});

it('keeps required-scope validation and clears the hint on editing in responsive mode', () => {
  const { resize, saveScope } = mount(false, { scope: { revision: 0, summary: '', alignment: [], risks: [] } });
  resize(800);
  fireEvent.click(screen.getByRole('button', { name: 'Expand scope' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save scope' }));
  const input = screen.getByRole('textbox', { name: 'Scope summary' });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent('Scope is required.');
  fireEvent.change(input, { target: { value: 'Project scope' } });
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});

it('keeps incoming workflow locks despite stale edit permissions in responsive mode', () => {
  const { resize, saveScope } = mount(false, { stageId: 5, subStageId: 10 });
  resize(800);
  expect(screen.getByRole('status')).toHaveTextContent('Scope & Assessment is read-only');
  fireEvent.click(screen.getByRole('button', { name: 'Expand scope' }));
  expect(screen.getByText('Read only')).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Expand alignment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand risks' }));
  expect(screen.queryByRole('textbox', { name: 'Add alignment item' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Add risk' })).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});
