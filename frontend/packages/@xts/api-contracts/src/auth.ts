export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

// Not GraphQL `input` types — the real login/register mutations take flat
// arguments (see auth.graphql), not a single wrapped `input` object. These
// just type the variables passed to the mutation on the client side.
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
