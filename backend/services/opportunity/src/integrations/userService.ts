import env from '../config/env';

export interface DirectoryUser {
  id: number;
  roleId: number | null;
  isActive: boolean | null;
}

async function listUsers(): Promise<DirectoryUser[]> {
  const response = await fetch(env.userServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ userList { id roleId isActive } }' }),
  });
  if (!response.ok) throw new Error(`User service returned ${response.status}.`);

  const body = await response.json() as {
    data?: { userList?: DirectoryUser[] | null };
    errors?: { message?: string }[];
  };
  if (body.errors?.length) throw new Error(body.errors[0].message || 'User service lookup failed.');
  return body.data?.userList ?? [];
}

async function findUser(userId: number): Promise<DirectoryUser | null> {
  return (await listUsers()).find((user) => user.id === userId && user.isActive !== false) ?? null;
}

async function findFirstActiveUserByRole(roleId: number): Promise<DirectoryUser | null> {
  return (await listUsers())
    .filter((user) => user.roleId === roleId && user.isActive !== false)
    .sort((left, right) => left.id - right.id)[0] ?? null;
}

async function findActiveUsersByRole(roleId: number): Promise<DirectoryUser[]> {
  return (await listUsers())
    .filter((user) => user.roleId === roleId && user.isActive !== false)
    .sort((left, right) => left.id - right.id);
}

export { findUser, findFirstActiveUserByRole, findActiveUsersByRole };