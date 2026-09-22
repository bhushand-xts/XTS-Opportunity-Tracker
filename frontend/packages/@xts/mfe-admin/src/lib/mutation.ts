import { toast } from "sonner";
import { getCurrentUserId } from "@xts/design-system";

/**
 * The backend records who made every change (`createdBy` / `updatedBy`, and
 * rejects a missing one), so mutations need the signed-in user's id. Throws a
 * readable error for the demo SSO identity, which has no user row.
 */
export function requireUserId(): number {
  const id = getCurrentUserId();
  if (id === null) {
    throw new Error("Please sign in with a registered account to make changes.");
  }
  return id;
}

/**
 * Runs a mutation and reports the outcome as a toast, so every screen handles
 * success and failure the same way. Resolves true on success, false on
 * failure. The backend's own error message (e.g. "A role with this name
 * already exists") is shown as-is.
 */
export async function runWithToast(
  work: () => Promise<unknown>,
  successMessage: string,
  failureMessage: string
): Promise<boolean> {
  try {
    await work();
    toast.success(successMessage);
    return true;
  } catch (error) {
    toast.error(error instanceof Error && error.message ? error.message : failureMessage);
    return false;
  }
}
