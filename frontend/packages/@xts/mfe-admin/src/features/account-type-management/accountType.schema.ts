import { z } from "zod";

export const accountTypeFormSchema = z.object({
  accountName: z.string().trim().min(1, "Account Name is required").max(100, "Account Name must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  isActive: z.boolean(),
});

export type AccountTypeFormValues = z.infer<typeof accountTypeFormSchema>;
