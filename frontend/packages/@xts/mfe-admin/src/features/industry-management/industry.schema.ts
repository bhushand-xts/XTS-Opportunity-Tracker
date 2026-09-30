import { z } from "zod";

export const industryFormSchema = z.object({
  industryName: z.string().trim().min(1, "Industry Name is required").max(100, "Industry Name must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  isActive: z.boolean(),
});

export type IndustryFormValues = z.infer<typeof industryFormSchema>;
