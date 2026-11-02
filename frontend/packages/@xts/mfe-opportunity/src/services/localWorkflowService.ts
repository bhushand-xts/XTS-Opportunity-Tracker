/**
 * Legacy estimation preview adapter. Opportunity data comes from the backend;
 * only the existing estimation preview is stored in the browser. Scope and
 * assessment always use the real backend, and legacy local scope is ignored.
 */
import type { Estimation, OpportunityDetail, Scope } from '@xts/api-contracts';
import type { OpportunityService } from './OpportunityService';

interface LocalRecord { revision: number; scope: Scope | null; estimation: Estimation | null; activity: NonNullable<OpportunityDetail['activity']>; }

const STORAGE_PREFIX = 'xts-opportunity-local-workflow:';
const LOCAL_ACTOR = { id: 'local-preview', name: 'Local preview', email: '', roles: [], active: true };

function read(id: string): LocalRecord | null {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + id); return raw ? JSON.parse(raw) as LocalRecord : null; } catch { return null; }
}
function write(id: string, record: LocalRecord) {
  try { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(record)); } catch { /* storage unavailable; preview state just won't persist across reloads */ }
}
function conflict(): never {
  throw Object.assign(new Error('This record changed while you were editing. Refresh before retrying.'), { code: 'REVISION_CONFLICT' });
}
function note(action: string, stored: LocalRecord | null): NonNullable<OpportunityDetail['activity']> {
  return [{ id: `local-${Date.now()}`, action, actor: LOCAL_ACTOR, at: new Date().toISOString(), note: null, packageRevision: null }, ...(stored?.activity ?? [])];
}
// Preserve the existing estimation preview without overriding the server's
// scope values or scope edit permission.
function project(base: OpportunityDetail): OpportunityDetail {
  const stored = read(base.id);
  return {
    ...base, revision: stored?.revision ?? base.revision,
    visibleModules: Array.from(new Set([...base.visibleModules, 'scope', 'estimation'])),
    allowedActions: Array.from(new Set([...base.allowedActions, 'EDIT_ESTIMATION'])),
    scope: base.scope, estimation: stored?.estimation ?? base.estimation,
    activity: [...(stored?.activity ?? []), ...(base.activity ?? [])],
  };
}

export function createLocalWorkflowService(base: OpportunityService): OpportunityService {
  return {
    ...base,
    async detail(id, signal, mode) {
      return project(await base.detail(id, signal, mode));
    },
    async saveEstimation(command) {
      const stored = read(command.opportunityId);
      if (command.expectedRevision !== (stored?.revision ?? command.expectedRevision)) conflict();
      const estimation: Estimation = { ...command.estimation, revision: (stored?.estimation?.revision ?? 0) + 1 };
      write(command.opportunityId, { revision: (stored?.revision ?? command.expectedRevision) + 1, scope: stored?.scope ?? null, estimation, activity: note('Estimation saved', stored) });
      return project(await base.detail(command.opportunityId));
    },
  };
}
