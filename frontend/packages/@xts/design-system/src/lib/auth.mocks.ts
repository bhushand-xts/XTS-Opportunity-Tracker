import type { AuthPayload, AuthUser, LoginInput, RegisterInput } from "@xts/api-contracts";
import { registerMockResolver } from "@xts/api-client";

/**
 * In-memory stand-in for the real auth backend — same pattern as
 * menu.mocks.ts/role.mocks.ts. Delete once the backend team's resolvers
 * are live; nothing else needs to change (see apolloClient.ts).
 *
 * `__typename` is stamped on every returned object because Apollo's
 * InMemoryCache (addTypename: true by default) needs it to normalize
 * entities — omit it and fields silently read back as undefined.
 */
type MockUser = AuthUser & { __typename: "AuthUser"; password: string };

let users: MockUser[] = [
  {
    __typename: "AuthUser",
    id: "1",
    email: "bdixit@xtsworld.in",
    firstName: "B",
    lastName: "Dixit",
    status: "APPROVED",
    roles: ["System Admin"],
    password: "demo1234",
  },
];

let nextId = users.length + 1;

function toPayload(user: MockUser): AuthPayload & { __typename?: "AuthPayload" } {
  const { password: _password, ...authUser } = user;
  return {
    __typename: "AuthPayload",
    token: `mock-token-${user.id}-${Date.now()}`,
    user: { ...authUser, __typename: "AuthUser" } as AuthUser & { __typename: "AuthUser" },
  };
}

registerMockResolver("Login", (variables) => {
  const { email, password } = variables as unknown as LoginInput;
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }
  return { login: toPayload(user) };
});

registerMockResolver("Register", (variables) => {
  const input = variables as unknown as RegisterInput;
  const clash = users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase());
  if (clash) {
    throw new Error("An account with this email already exists.");
  }

  const user: MockUser = {
    __typename: "AuthUser",
    id: String(nextId++),
    email: input.email.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    // No role assigned yet — that's what makes a new account "pending".
    // An admin assigning a role (User Role Assignment, not built yet)
    // should flip this to APPROVED.
    status: "PENDING",
    roles: [],
    password: input.password,
  };
  users = [...users, user];
  return { register: toPayload(user) };
});
