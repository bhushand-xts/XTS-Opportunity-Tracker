// The permission contract: every mfe-*/src/permissions.ts exports a
// PermissionMap built from these types, and the shell's route guard and
// each subgraph resolver check the same role set -- so a hidden button
// and a blocked mutation can never drift apart.

export type Role =
  | "sales_executive"
  | "sales_manager"
  | "sales_head"
  | "management"
  | "administrator";

export type PermissionMap = Record<string, Role[]>;

export function can(role: Role, permission: string, map: PermissionMap): boolean {
  return map[permission]?.includes(role) ?? false;
}
