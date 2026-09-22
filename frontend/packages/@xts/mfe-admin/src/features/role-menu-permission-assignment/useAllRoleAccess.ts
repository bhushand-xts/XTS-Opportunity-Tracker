import { gql, useQuery } from "@apollo/client";
import { useMemo } from "react";

export interface RoleAccessRow {
  roleId: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  permissionName: string;
  permissionKey: string;
}

// roleAccess only takes a single roleId (no bulk "every grant" query exists
// on this backend, unlike menu-permission-mapping's menuPermissionMappings)
// — so this builds one query per role, aliased, and fires it as ONE network
// request rather than N. `gql` caches by exact source text, so calling it
// repeatedly with the same role set is cheap and returns a stable
// DocumentNode.
function buildAllRoleAccessQuery(roleIds: number[]) {
  const fields = roleIds
    .map(
      (id) =>
        `r${id}: roleAccess(roleId: ${id}) { roleId menuId permissionId menuName permissionName permissionKey }`
    )
    .join("\n");
  return gql`query GetAllRoleAccess { ${fields} }`;
}

const NOOP_QUERY = gql`
  query NoopRoleAccess {
    __typename
  }
`;

export function useAllRoleAccess(roleIds: number[]) {
  const roleIdsKey = roleIds.join(",");
  const query = useMemo(
    () => (roleIds.length > 0 ? buildAllRoleAccessQuery(roleIds) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roleIdsKey is the real, stable dependency; roleIds itself is a new array reference every render
    [roleIdsKey]
  );

  const { data, loading, error, refetch } = useQuery<Record<string, RoleAccessRow[]>>(query ?? NOOP_QUERY, {
    skip: !query,
  });

  const rows = useMemo(() => (data ? Object.values(data).flat() : []), [data]);

  return { rows, loading, error, refetch };
}
