import { z } from "zod";

// Sentinel used by the Parent Menu <Select> for "no parent" — Radix Select
// doesn't allow an empty-string item value, so this stands in for `null`.
export const NO_PARENT_MENU = "none";

export const menuFormSchema = z.object({
  menuName: z.string().trim().min(1, "Menu Name is required"),
  menuKey: z.string().trim().min(1, "Menu Key is required"),
  icon: z.string().trim().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce
    .number({ invalid_type_error: "Sort Order is required" })
    .int("Sort Order must be a whole number")
    .min(0, "Sort Order must be 0 or greater"),
  isActive: z.boolean(),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;
