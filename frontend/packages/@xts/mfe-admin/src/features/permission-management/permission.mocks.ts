import type { Permission, PermissionInput } from "@xts/api-contracts";
import { registerMockResolver } from "@xts/api-client";

/**
 * In-memory stand-in for the real backend. Enforces the same rules a real
 * resolver must (duplicate permissionName, block delete while assigned to a
 * role) so the UI's error handling is exercised realistically — delete this
 * file once the backend team's resolvers are live.
 *
 * `assignedRoleIds` starts empty on every seed row since Role Master doesn't
 * exist yet — the delete guard below is fully wired and correct, it simply
 * has nothing to block against until Role Master starts assigning
 * permissions to roles. No rework needed here when that happens.
 */
type MockPermission = Permission & { __typename: "Permission" };

let permissions: MockPermission[] = [
  { __typename: "Permission", id: "1", permissionName: "menu.view", isActive: true, assignedRoleIds: [] },
  { __typename: "Permission", id: "2", permissionName: "menu.create", isActive: true, assignedRoleIds: [] },
  { __typename: "Permission", id: "3", permissionName: "menu.edit", isActive: true, assignedRoleIds: [] },
  { __typename: "Permission", id: "4", permissionName: "menu.delete", isActive: false, assignedRoleIds: [] },
];

let nextId = permissions.length + 1;

function assertNoDuplicateName(permissionName: string, excludeId?: string) {
  const clash = permissions.some(
    (p) => p.id !== excludeId && p.permissionName.trim().toLowerCase() === permissionName.trim().toLowerCase()
  );
  if (clash) {
    throw new Error(`A permission named "${permissionName}" already exists.`);
  }
}

registerMockResolver("GetPermissions", () => {
  return { permissions: [...permissions] };
});

registerMockResolver("CreatePermission", (variables) => {
  const input = variables.input as PermissionInput;
  assertNoDuplicateName(input.permissionName);

  const permission: MockPermission = {
    __typename: "Permission",
    id: String(nextId++),
    permissionName: input.permissionName.trim(),
    isActive: input.isActive,
    assignedRoleIds: [],
  };
  permissions = [...permissions, permission];
  return { createPermission: permission };
});

registerMockResolver("UpdatePermission", (variables) => {
  const { id, input } = variables as { id: string; input: PermissionInput };
  const existing = permissions.find((p) => p.id === id);
  if (!existing) {
    throw new Error("Permission not found.");
  }
  assertNoDuplicateName(input.permissionName, id);

  const updated: MockPermission = {
    ...existing,
    permissionName: input.permissionName.trim(),
    isActive: input.isActive,
  };
  permissions = permissions.map((p) => (p.id === id ? updated : p));
  return { updatePermission: updated };
});

registerMockResolver("DeletePermission", (variables) => {
  const { id } = variables as { id: string };
  const existing = permissions.find((p) => p.id === id);
  if (!existing) {
    throw new Error("Permission not found.");
  }
  if (existing.assignedRoleIds.length > 0) {
    throw new Error("This permission is assigned to a role and cannot be deleted.");
  }
  permissions = permissions.filter((p) => p.id !== id);
  return { deletePermission: id };
});
