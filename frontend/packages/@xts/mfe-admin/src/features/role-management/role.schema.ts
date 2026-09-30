import { z } from "zod";

// Limits match the column sizes of mst_roles.
export const roleFormSchema = z.object({
  roleName: z.string().trim().min(1, "Role Name is required").max(100, "Role Name must be at most 100 characters"),
  roleCode: z
    .string()
    .trim()
    .max(50, "Role Code must be at most 50 characters")
    .regex(/^\S*$/, "Role Code cannot contain spaces")
    .optional(),
  description: z.string().trim().max(100, "Description must be at most 100 characters").optional(),
  isActive: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
