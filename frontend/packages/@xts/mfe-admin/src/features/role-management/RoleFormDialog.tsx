import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Role, RoleInput } from "@xts/api-contracts";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@xts/design-system";
import { roleFormSchema, type RoleFormValues } from "./role.schema";
import { useRoleMutations } from "./useRoleMutations";

const EMPTY: RoleFormValues = { roleName: "", roleCode: "", description: "", isActive: true };

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  allRoles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  allRoles: Role[];
}) {
  const isEdit = role !== null;
  const { createRole, updateRole, saving } = useRoleMutations();

  const form = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      role
        ? {
            roleName: role.roleName,
            roleCode: role.roleCode ?? "",
            description: role.description ?? "",
            isActive: role.isActive,
          }
        : EMPTY
    );
  }, [open, role, form]);

  async function onSubmit(values: RoleFormValues) {
    const others = allRoles.filter((r) => r.id !== role?.id);
    const name = values.roleName.trim().toLowerCase();
    if (others.some((r) => r.roleName.trim().toLowerCase() === name)) {
      form.setError("roleName", { message: `A role named "${values.roleName.trim()}" already exists.` });
      return;
    }
    const code = values.roleCode?.trim() ?? "";
    if (code && others.some((r) => r.roleCode?.toLowerCase() === code.toLowerCase())) {
      form.setError("roleCode", { message: `The code "${code}" is already used by another role.` });
      return;
    }

    const input: RoleInput = {
      roleName: values.roleName.trim(),
      roleCode: code || null,
      description: values.description?.trim() || null,
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateRole(role.id, input) : await createRole(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit role" : "Add role"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this role's details." : "Create a new functional user role."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sales Manager" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SALES_MANAGER" {...field} />
                  </FormControl>
                  <FormDescription>Optional. A short unique identifier, without spaces.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="What is this role responsible for?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
