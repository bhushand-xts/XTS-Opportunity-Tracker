import { toast } from "sonner";

// The backend has no create/update/delete mutations for menus at all (the
// menus resolvers export an empty `Mutation: {}`), so there is nothing to
// call. These stay as no-ops — same shape callers expect (create/update/
// saving) — so MenuFormDialog's Save flow still has something to invoke
// without ever sending a GraphQL request.
export function useMenuMutations() {
  async function createMenu(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  async function updateMenu(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  return { createMenu, updateMenu, saving: false };
}
