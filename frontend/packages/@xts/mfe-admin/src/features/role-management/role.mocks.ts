import type { Role, RoleInput } from "@xts/api-contracts";
import { registerMockResolver } from "@xts/api-client";
import { slugify } from "./role.utils";

/**
 * In-memory stand-in for the real backend. Enforces the same rules a real
 * resolver must (duplicate roleName, block delete while assigned to a user)
 * so the UI's error handling is exercised realistically — delete this file
 * once the backend team's resolvers are live.
 *
 * `assignedUserIds` starts empty on every seed row since User Role
 * Assignment doesn't exist yet — the delete guard below is fully wired and
 * correct, it simply has nothing to block against until that screen starts
 * assigning roles to users. No rework needed here when that happens.
 */
type MockRole = Role & { __typename: "Role" };

let roles: MockRole[] = [
  { __typename: "Role", id: "1", roleName: "System Admin", roleCode: "system-admin", isActive: true, assignedUserIds: [] },
  { __typename: "Role", id: "2", roleName: "Sales Manager", roleCode: "sales-manager", isActive: true, assignedUserIds: [] },
  { __typename: "Role", id: "3", roleName: "Sales Rep", roleCode: "sales-rep", isActive: true, assignedUserIds: [] },
  { __typename: "Role", id: "4", roleName: "Auditor", roleCode: "auditor", isActive: false, assignedUserIds: [] },
];

let nextId = roles.length + 1;

function assertNoDuplicateName(roleName: string, excludeId?: string) {
  const clash = roles.some(
    (r) => r.id !== excludeId && r.roleName.trim().toLowerCase() === roleName.trim().toLowerCase()
  );
  if (clash) {
    throw new Error(`A role named "${roleName}" already exists.`);
  }
}

function uniqueRoleCode(roleName: string): string {
  const base = slugify(roleName) || "role";
  let code = base;
  let suffix = 1;
  while (roles.some((r) => r.roleCode === code)) {
    code = `${base}-${++suffix}`;
  }
  return code;
}

registerMockResolver("GetRoles", () => {
  return { roles: [...roles] };
});

registerMockResolver("CreateRole", (variables) => {
  const input = variables.input as RoleInput;
  assertNoDuplicateName(input.roleName);

  const role: MockRole = {
    __typename: "Role",
    id: String(nextId++),
    roleName: input.roleName.trim(),
    roleCode: uniqueRoleCode(input.roleName),
    isActive: input.isActive,
    assignedUserIds: [],
  };
  roles = [...roles, role];
  return { createRole: role };
});

registerMockResolver("UpdateRole", (variables) => {
  const { id, input } = variables as { id: string; input: RoleInput };
  const existing = roles.find((r) => r.id === id);
  if (!existing) {
    throw new Error("Role not found.");
  }
  assertNoDuplicateName(input.roleName, id);

  const updated: MockRole = {
    ...existing,
    roleName: input.roleName.trim(),
    isActive: input.isActive,
    // roleCode is a stable identifier — intentionally not regenerated on rename.
  };
  roles = roles.map((r) => (r.id === id ? updated : r));
  return { updateRole: updated };
});

registerMockResolver("DeleteRole", (variables) => {
  const { id } = variables as { id: string };
  const existing = roles.find((r) => r.id === id);
  if (!existing) {
    throw new Error("Role not found.");
  }
  if (existing.assignedUserIds.length > 0) {
    throw new Error("This role is assigned to a user and cannot be deleted.");
  }
  roles = roles.filter((r) => r.id !== id);
  return { deleteRole: id };
});
