import { toast } from "sonner";

// The backend has no create/update/delete mutations for permissions at all
// (the permissions resolvers export an empty `Mutation: {}`), so there is
// nothing to call. These stay as no-ops — same shape callers expect
// (create/update/delete/saving) — so the master page and form dialog still
// have something to invoke without ever sending a GraphQL request.
export function usePermissionMutations() {
  async function createPermission(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  async function updatePermission(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  async function deletePermission(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  return { createPermission, updatePermission, deletePermission, saving: false };
}
