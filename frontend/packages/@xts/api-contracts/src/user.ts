// Mirrors the user service's `User` type
// (backend/services/user/src/graphql/typeDefs/user.typeDefs.ts), as returned by `userList`.

export interface ManagedUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  /** The one role assigned to the user (a Role id), or null. */
  roleId: number | null;
  isActive: boolean | null;
}
