import { useQuery } from '@apollo/client';
import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { GET_OPPORTUNITY_MENUS, hasOpportunityPermission, resolveOpportunityMenus, useAuth, type OpportunityMenuRecord } from '@xts/design-system';
import { Loading, Notice } from '../components/ui';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from './useResource';

export interface OpportunityAccess { userId?: string; view: boolean; add: boolean; edit: boolean; approvals: boolean; work: boolean; clientCreate?: boolean; }
export const OpportunityAccessContext = createContext<OpportunityAccess>({ view: false, add: false, edit: false, approvals: false, work: false });
export function OpportunityAccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const service = useOpportunityService();
  const loadActions = useCallback(() => service.globalActions(), [service]);
  const actions = useResource(loadActions, Boolean(auth.session));
  const { data, loading, error, refetch } = useQuery<{ menus: OpportunityMenuRecord[] }>(GET_OPPORTUNITY_MENUS, { fetchPolicy: 'cache-and-network' });
  const menus = resolveOpportunityMenus(data?.menus ?? []);
  const granted = (permission: string) => hasOpportunityPermission(menus, auth.hasPermission, permission);
  if (loading && !data) return <Loading label="Checking Opportunity access…" />;
  if (error) return <Notice error={error} retry={() => void refetch()} />;
  if (!menus.length) return <Notice title="Opportunities menu unavailable" error="No active Opportunity menu is configured for this backend. Contact your administrator." />;
  if (!granted('view') && !granted('approve') && !granted('reject')) return <Notice title="Access restricted" error="Your role does not have access to the active Opportunities menu. Contact your administrator." />;
  return <OpportunityAccessContext.Provider value={{ userId: auth.session?.userId, view: granted('view') || granted('approve') || granted('reject'), add: granted('add'), edit: granted('edit'), work: granted('view'), approvals: granted('approve') || granted('reject'), clientCreate: actions.data?.includes('CLIENT_CREATE') ?? false }}>{children}</OpportunityAccessContext.Provider>;
}
export function useOpportunityAccess() { return useContext(OpportunityAccessContext); }
