import { gql, useQuery } from "@apollo/client";
import type { ManagedUser } from "@xts/api-contracts";

// A real (not mocked) query against the already-deployed user service's
// userList — same query mfe-admin's user-role-assignment feature uses (see
// mfe-admin/features/user-role-assignment/userRole.queries.ts). Duplicated
// here rather than imported across the MFE boundary; it's one query doc.
const GET_USERS_FOR_ASSIGNMENT = gql`
  query GetUsersForAssignment {
    userList {
      id
      firstName
      lastName
      email
      isActive
    }
  }
`;

/** Active users only, for assignee/reviewer/owner pickers — closes the
 * audit's "active users only" gap for Assignment (Stage 7). */
export function useRealUsers() {
  const { data, loading, error } = useQuery<{ userList: ManagedUser[] }>(GET_USERS_FOR_ASSIGNMENT, {
    fetchPolicy: "cache-and-network",
  });

  return {
    users: (data?.userList ?? []).filter((u) => u.isActive !== false),
    loading: loading && data === undefined,
    error,
  };
}

export function realUserName(user: ManagedUser): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

/** Looks up a user by id across the real user list — ids here are compared as
 * strings since RfpQuestionItem/RfpSection store assigneeId/reviewerId/ownerId
 * as strings (so they didn't have to change shape when this moved off the
 * mock StoreUser list). */
export function findRealUserName(users: ManagedUser[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  const user = users.find((u) => String(u.id) === id);
  return user ? realUserName(user) : undefined;
}
