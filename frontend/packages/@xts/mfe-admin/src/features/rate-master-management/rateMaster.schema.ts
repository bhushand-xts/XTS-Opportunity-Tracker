import { z } from "zod";

export const rateMasterFormSchema = z.object({
  roleName: z.string().trim().min(1, "Technical role name is required"),
  roleCode: z.string().trim().min(1, "Role code is required"),
  currencyId: z.number().min(1, "Currency is required"),
  rateType: z.string().trim().min(1, "Rate type is required").refine((value) =>["Hourly", "Daily", "Weekly", "Monthly", "Yearly"].includes(value),"Please select a valid rate type"),
  defaultRate: z
    .string()
    .trim()
    .min(1, "Default rate is required")
    .refine((value) => Number(value) > 0, "Rate must be greater than zero"),
  location: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export type RateMasterFormValues = z.infer<typeof rateMasterFormSchema>;