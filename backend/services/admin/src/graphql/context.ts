// Who is making the request.
//
// The gateway verifies the login token and passes the user's id on in an
// `x-user-id` header (see gateway/src/middleware/auth.middleware.ts). That id is
// what gets recorded as created_by / updated_by.

export interface RequestContext {
  user: { id: number } | null;
}

export function buildContext({ req }: { req: { header(name: string): string | undefined } }): RequestContext {
  const id = Number(req.header('x-user-id'));
  return { user: Number.isInteger(id) && id > 0 ? { id } : null };
}

/**
 * The id to record as created_by / updated_by: the signed-in user's, if there
 * is one — it always wins, so a caller cannot put someone else's name on a
 * change. Otherwise the id the caller supplied (used when calling a service
 * directly, without going through the gateway). Undefined if neither exists.
 */
export function actingUserId(ctx: RequestContext | undefined, provided?: number | null): number | undefined {
  return ctx?.user?.id ?? provided ?? undefined;
}
