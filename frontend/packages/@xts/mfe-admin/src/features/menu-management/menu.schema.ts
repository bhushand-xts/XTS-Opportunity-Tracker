import { z } from "zod";

export const menuFormSchema = z
  .object({
    menuName: z.string().trim().min(1, "Menu Name is required"),
    menuType: z.enum(["MAIN_MENU", "SUB_MENU"], {
      required_error: "Menu Type is required",
    }),
    parentMenuId: z.string().optional(),
    icon: z.string().optional(),
    displayOrder: z.coerce
      .number({ invalid_type_error: "Display Order is required" })
      .int("Display Order must be a whole number")
      .min(1, "Display Order must be at least 1"),
    isActive: z.boolean(),
  })
  .refine((data) => data.menuType !== "SUB_MENU" || !!data.parentMenuId, {
    message: "Parent Menu is required for a Submenu",
    path: ["parentMenuId"],
  });

export type MenuFormValues = z.infer<typeof menuFormSchema>;

export const MENU_TYPE_LABEL: Record<MenuFormValues["menuType"], string> = {
  MAIN_MENU: "Main Menu",
  SUB_MENU: "Submenu",
};
