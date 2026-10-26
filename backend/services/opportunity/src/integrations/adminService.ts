import env from '../config/env';
import type { AccessGrant, AccessMenu, WorkflowRole } from '../lib/opportunityAccess';

export async function roleAccess(roleId: number) {
  const response = await fetch(env.adminServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query OpportunityRoleAccess($roleId: Int!) {
        roleAccess(roleId: $roleId) { menuId permissionKey }
        menus(asTree: false) { menuId menuKey menuName parentId routePath isActive }
        role(id: $roleId) { id roleName roleCode isActive }
      }`,
      variables: { roleId },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Unable to verify assigned opportunity permissions.');
  const result = await response.json() as {
    data?: { roleAccess: AccessGrant[]; menus: AccessMenu[]; role?: WorkflowRole | null };
    errors?: { message?: string }[];
  };
  if (result.errors?.length || !result.data) throw new Error('Unable to verify assigned opportunity permissions.');
  return result.data;
}

export async function holdReasonCode(id: number) {
  const response = await fetch(env.adminServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `query OpportunityHoldReason($id: Int!) {
      reasonCode(id: $id) { id reasonName description isActive }
    }`, variables: { id } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Unable to verify the hold reason. Please retry.');
  const result = await response.json() as {
    data?: { reasonCode: { id: number; reasonName: string; description: string | null; isActive: boolean } | null };
    errors?: { message?: string }[];
  };
  if (result.errors?.length || !result.data) throw new Error('Unable to verify the hold reason. Please retry.');
  return result.data.reasonCode;
}
