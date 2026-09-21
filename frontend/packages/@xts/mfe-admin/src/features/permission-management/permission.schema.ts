import { z } from "zod";

export const permissionFormSchema = z.object({
  permissionName: z.string().trim().min(1, "Permission Name is required"),
  permissionKey: z.string().trim().min(1, "Permission Key is required"),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
