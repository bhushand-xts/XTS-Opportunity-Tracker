import env from '../config/env';
import type { AccessGrant, AccessMenu, AccessRole } from '../lib/opportunityAccess';

export async function reasonCode(id: number) {
  const response = await fetch(env.adminServiceUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'query HoldReason($id: Int!) { reasonCode(id: $id) { id reasonName isActive } }', variables: { id } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Unable to verify the selected hold reason.');
  const result = await response.json() as { data?: { reasonCode: { id: number; reasonName: string; isActive: boolean } | null }; errors?: unknown[] };
  if (result.errors?.length || !result.data) throw new Error('Unable to verify the selected hold reason.');
  return result.data.reasonCode;
}

export async function roleAccess(roleId: number) {
  const response = await fetch(env.adminServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query OpportunityRoleAccess($roleId: Int!) {
        role(id: $roleId) { roleName roleCode }
        roleAccess(roleId: $roleId) { menuId permissionKey }
        menus(asTree: false) { menuId menuKey menuName parentId routePath isActive }
      }`,
      variables: { roleId },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Unable to verify assigned opportunity permissions.');
  const result = await response.json() as {
    data?: { roleAccess: AccessGrant[]; menus: AccessMenu[]; role: AccessRole | null };
    errors?: { message?: string }[];
  };
  if (result.errors?.length || !result.data?.role) throw new Error('Unable to verify assigned opportunity permissions.');
  return result.data;
}
