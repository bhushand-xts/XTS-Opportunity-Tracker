import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import type { DirectoryUser } from '@xts/api-contracts';
import { GET_OPPORTUNITY_OWNER_DIRECTORY, type OwnerDirectoryData } from './userDirectory.queries';

export function mapOwnerDirectory(data: OwnerDirectoryData | undefined): DirectoryUser[] {
  const roles = new Map(data?.rolesList?.filter(role => role !== null).map(role => [role.id, role]));
  return (data?.userList ?? []).filter(user => user !== null).map(user => {
    const role = user.roleId === null ? undefined : roles.get(user.roleId);
    const roleName = role ? role.roleName.trim() || role.roleCode?.trim() || `Role ${role.id}` : undefined;
    return {
      id: String(user.id),
      name: [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(' ') || `User ${user.id}`,
      email: user.email,
      roles: user.roleId === null ? [] : [roleName ? `${roleName}${role?.isActive ? '' : ' (inactive)'}` : `Role ${user.roleId}`],
      active: user.isActive === true,
    };
  }).sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

/** Uses the app's shared authenticated ApolloProvider and master-data cache. */
export function useOwnerDirectory(enabled = true) {
  const { data, loading, error, refetch } = useQuery<OwnerDirectoryData>(GET_OPPORTUNITY_OWNER_DIRECTORY, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const users = useMemo(() => mapOwnerDirectory(data), [data]);
  const unavailable = enabled && !loading && !error && data && !Array.isArray(data.userList)
    ? new Error('The owner directory returned no user data. Please retry.')
    : undefined;
  return {
    users,
    loading: loading && !data,
    error: error ?? unavailable,
    reload: () => { void refetch().catch(() => { /* Apollo exposes the retry error above. */ }); },
  };
}
