import { z } from "zod";

export const permissionFormSchema = z.object({
  permissionName: z.string().trim().min(1, "Permission Name is required"),
  isActive: z.boolean(),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
