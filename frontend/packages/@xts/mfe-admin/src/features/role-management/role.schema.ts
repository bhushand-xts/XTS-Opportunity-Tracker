import { z } from "zod";

export const roleFormSchema = z.object({
  roleName: z.string().trim().min(1, "Role Name is required"),
  isActive: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
