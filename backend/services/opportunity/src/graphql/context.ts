export interface RequestContext {
  user: { id: number } | null;
}

export function buildContext({ req }: { req: { header(name: string): string | undefined } }): RequestContext {
  const id = Number(req.header('x-user-id'));
  return { user: Number.isInteger(id) && id > 0 ? { id } : null };
}