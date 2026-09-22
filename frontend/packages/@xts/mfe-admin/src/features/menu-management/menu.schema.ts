import { z } from "zod";

/** Select value meaning "no parent" (Radix Select can't use an empty string). */
export const NO_PARENT = "none";

// Limits match the column sizes of mst_menus.
export const menuFormSchema = z.object({
  menuName: z.string().trim().min(1, "Menu Name is required").max(100, "Menu Name must be at most 100 characters"),
  menuKey: z
    .string()
    .trim()
    .min(1, "Menu Key is required")
    .max(100, "Menu Key must be at most 100 characters")
    // Underscores are allowed because existing keys use them (e.g. "test_menu").
    .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Use lowercase letters, numbers, hyphens and underscores only"),
  icon: z.string().optional(),
  parentId: z.string(),
  sortOrder: z.coerce
    .number({ invalid_type_error: "Sort Order is required" })
    .int("Sort Order must be a whole number")
    .min(0, "Sort Order cannot be negative"),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;
