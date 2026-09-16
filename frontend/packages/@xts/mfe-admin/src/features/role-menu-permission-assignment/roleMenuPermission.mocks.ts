import type { RoleMenuPermission, RoleMenuPermissionInput } from "@xts/api-contracts";
import { registerMockResolver } from "@xts/api-client";

/**
 * In-memory stand-in for the real backend. Unlike menu/permission/role, this
 * isn't row-level CRUD — it's one mapping document per role, replaced whole
 * on every save. Delete this file once the backend team's resolvers are live.
 */
type MockRoleMenuPermission = RoleMenuPermission & { __typename: "RoleMenuPermission" };

const byRoleId = new Map<string, MockRoleMenuPermission[]>();

registerMockResolver("GetRoleMenuPermissions", (variables) => {
  const { roleId } = variables as { roleId: string };
  return { roleMenuPermissions: byRoleId.get(roleId) ?? [] };
});

registerMockResolver("SaveRoleMenuPermissions", (variables) => {
  const { roleId, entries } = variables as { roleId: string; entries: RoleMenuPermissionInput[] };

  if (entries.length === 0) {
    throw new Error("Select at least one menu before saving.");
  }

  const saved: MockRoleMenuPermission[] = entries.map((entry) => ({
    __typename: "RoleMenuPermission",
    roleId,
    ...entry,
  }));
  byRoleId.set(roleId, saved);
  return { saveRoleMenuPermissions: saved };
});
