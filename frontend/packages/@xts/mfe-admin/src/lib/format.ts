/**
 * The API returns timestamps as strings — sometimes epoch milliseconds
 * ("1789619907112"), sometimes an ISO / SQL date. Show either as a local
 * date and time, and fall back to a dash when there is nothing to show.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** The user id recorded on a change. Only ids are stored, not names. */
export function formatUser(userId: number | null | undefined): string {
  return userId ? `User #${userId}` : "—";
}

/**
 * Builds a userId -> display name lookup from a fetched user list, for
 * history views that would otherwise only be able to show "User #4". Falls
 * back to that same "User #<id>" form when the id isn't in the list (user
 * list still loading, or the user was later deleted).
 */
export function buildUserResolver(
  users: { id: number; firstName: string | null; lastName: string | null }[]
): (userId: number | null | undefined) => string {
  const byId = new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ")]));
  return (userId) => {
    if (!userId) return "—";
    return byId.get(userId) || formatUser(userId);
  };
}
