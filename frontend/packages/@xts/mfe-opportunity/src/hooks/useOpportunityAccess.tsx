import { useQuery } from '@apollo/client';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { GET_OPPORTUNITY_MENUS, opportunityMenuPermissions, resolveOpportunityMenus, useAuth, type OpportunityMenuRecord } from '@xts/design-system';
import { Loading, Notice } from '../components/ui';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from './useResource';
import { AccessUnavailable } from '../components/AccessUnavailable';
import { approvalStagesForRole, workStagesForRole } from '../lib/opportunityStatus';

export interface OpportunityAccess { userId?: string; view: boolean; pipeline?: boolean; add: boolean; edit: boolean; approvals: boolean; approvalStageIds?: number[]; work: boolean; workStageIds?: number[]; clientCreate?: boolean; clientUpdate?: boolean; }
export const OpportunityAccessContext = createContext<OpportunityAccess>({ view: false, add: false, edit: false, approvals: false, work: false });
export function OpportunityAccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const service = useOpportunityService();
  const { data, loading, error, refetch } = useQuery<{ menus: OpportunityMenuRecord[] }>(GET_OPPORTUNITY_MENUS, { fetchPolicy: 'cache-and-network' });
  const menus = resolveOpportunityMenus(data?.menus ?? []);
  const permissions = opportunityMenuPermissions(data?.menus ?? [], auth.hasPermission);
  const loadActions = useCallback(() => service.globalActions(), [service, permissions.add, permissions.edit]);
  const actions = useResource(loadActions, Boolean(auth.session && permissions.view && (permissions.add || permissions.edit)));
  const entry = permissions.view;
  const visited = useRef(false);
  useEffect(() => { if (entry) visited.current = true; }, [entry]);
  if (loading && !data) return <Loading label="Checking Opportunity access…" />;
  if (error) return <Notice error={error} retry={() => void refetch()} />;
  if (!menus.length) return <Notice title="Opportunities menu unavailable" error="No active Opportunity menu is configured for this backend. Contact your administrator." />;
  if (!entry) return <AccessUnavailable page="Opportunities" changed={visited.current} />;
  return <OpportunityAccessContext.Provider value={{ userId: auth.session?.userId, view: entry, pipeline: permissions.pipeline, add: permissions.add, edit: permissions.edit, work: permissions.work, workStageIds: permissions.work ? workStagesForRole(auth.roleName) : [], approvals: permissions.approvals, approvalStageIds: permissions.approvals ? approvalStagesForRole(auth.roleName) : [], clientCreate: permissions.add && (actions.data?.includes('CLIENT_CREATE') ?? false), clientUpdate: permissions.edit && (actions.data?.includes('CLIENT_UPDATE') ?? false) }}>{children}</OpportunityAccessContext.Provider>;
}
export function useOpportunityAccess() { return useContext(OpportunityAccessContext); }
