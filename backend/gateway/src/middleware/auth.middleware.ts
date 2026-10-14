import { Request, Response, NextFunction } from 'express';
import { userServiceUrl } from '../config/services';

// Works out who is signed in and puts them on the request as `req.user`.
//
// The login token (Authorization: Bearer ...) is checked by the user service,
// which owns the sessions. The gateway then hands the user's id to the other
// services, so created_by / updated_by always come from the login and not from
// whatever the caller typed in.
//
// A missing, invalid or expired token — or an unreachable user service — simply
// means "not signed in" (req.user = null). This middleware never blocks a
// request; services decide what to do with an anonymous caller.

const POSITIVE_TTL_MS = 60_000; // a valid token is trusted for a minute
const NEGATIVE_TTL_MS = 10_000; // an unknown token is re-checked sooner
const MAX_CACHED = 1000;

const cache = new Map<string, { userId: number | null; expires: number }>();

async function lookupUserId(token: string): Promise<number | null> {
  const cached = cache.get(token);
  if (cached && cached.expires > Date.now()) return cached.userId;

  let userId: number | null = null;
  try {
    const response = await fetch(userServiceUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: '{ currentUserId }' }),
      signal: AbortSignal.timeout(3000),
    });
    const body = (await response.json()) as { data?: { currentUserId?: number | null } };
    userId = body.data?.currentUserId ?? null;
  } catch {
    return null; // user service unreachable: treat as anonymous, and do not cache the failure
  }

  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(token, { userId, expires: Date.now() + (userId ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS) });
  return userId;
}

export default async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  (req as any).user = null;

  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) {
    const id = await lookupUserId(token);
    if (id) (req as any).user = { id };
  }
  next();
}
