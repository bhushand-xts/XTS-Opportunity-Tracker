import env from '../config/env';

// user and admin each own their own database, so "does this role exist and is
// it active" can't be a SQL join — it is a real call to the admin service's
// GraphQL API instead.

export interface RoleSummary {
  id: number;
  isActive: boolean;
}

// The role, or null if the admin service says there is no such role.
// Any other failure (service down, unexpected reply) throws, so we never
// assign a role we could not verify.
async function findRole(roleId: number): Promise<RoleSummary | null> {
  let response: Response;
  try {
    response = await fetch(env.adminServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query($id: Int!) { role(id: $id) { id isActive } }',
        variables: { id: roleId },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new Error('Could not verify the role: the admin service is not reachable.');
  }

  if (!response.ok) {
    throw new Error(`Could not verify the role: the admin service returned ${response.status}.`);
  }

  const body = (await response.json()) as {
    data?: { role?: RoleSummary | null };
    errors?: { message?: string }[];
  };

  if (body.errors?.length) {
    if (body.errors.some((e) => /not found/i.test(e.message ?? ''))) return null;
    throw new Error('Could not verify the role: the admin service returned an error.');
  }
  return body.data?.role ?? null;
}

export { findRole };
