import env from '../config/env';
import type { AccessGrant, AccessMenu } from '../lib/opportunityAccess';

export async function roleAccess(roleId: number) {
  const response = await fetch(env.adminServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query OpportunityRoleAccess($roleId: Int!) {
        roleAccess(roleId: $roleId) { menuId permissionKey }
        menus(asTree: false) { menuId menuKey menuName parentId routePath isActive }
      }`,
      variables: { roleId },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Unable to verify assigned opportunity permissions.');
  const result = await response.json() as {
    data?: { roleAccess: AccessGrant[]; menus: AccessMenu[] };
    errors?: { message?: string }[];
  };
  if (result.errors?.length || !result.data) throw new Error('Unable to verify assigned opportunity permissions.');
  return result.data;
}
