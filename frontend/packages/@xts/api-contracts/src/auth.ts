// Mirrors the user service's `AuthPayload` / `User` types
// (backend/services/user/src/graphql/typeDefs/user.typeDefs.ts).

export interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: number | null;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

// The login/register mutations take flat arguments, not a wrapped `input`.
// These type the variables passed to them from the client.
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
