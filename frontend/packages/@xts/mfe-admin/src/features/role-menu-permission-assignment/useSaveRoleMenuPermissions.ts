import { toast } from "sonner";

// The backend has no saveRoleMenuPermissions mutation (or any role/menu/
// permission linking mutation) at all — there is nothing to call. This
// stays as a no-op so the page's Save flow still has something to invoke
// without ever sending a GraphQL request.
export function useSaveRoleMenuPermissions() {
  async function saveRoleMenuPermissions(): Promise<boolean> {
    toast.error("This feature isn't available yet — the backend hasn't implemented it.");
    return false;
  }

  return { saveRoleMenuPermissions, saving: false };
}
