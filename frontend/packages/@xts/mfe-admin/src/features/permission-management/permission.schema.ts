import { z } from "zod";

// Limits match the column sizes of mst_permissions.
export const permissionFormSchema = z.object({
  permissionName: z
    .string()
    .trim()
    .min(1, "Permission Name is required")
    .max(100, "Permission Name must be at most 100 characters"),
  permissionKey: z
    .string()
    .trim()
    .min(1, "Permission Key is required")
    .max(100, "Permission Key must be at most 100 characters")
    .regex(/^\S+$/, "Permission Key cannot contain spaces"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
