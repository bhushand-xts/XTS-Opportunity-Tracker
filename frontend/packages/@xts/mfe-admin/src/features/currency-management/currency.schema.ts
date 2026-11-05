import { z } from "zod";

export const currencyFormSchema = z.object({
  currencyName: z.string().trim().min(1, "Currency name is required"),
  currencyCode: z
    .string()
    .trim()
    .min(1, "Currency code is required")
    .max(10, "Maximum 10 characters"),
  currencySymbol: z
    .string()
    .trim()
    .min(1, "Currency symbol is required")
    .max(10, "Maximum 10 characters"),
  isActive: z.boolean(),
});

export type CurrencyFormValues = z.infer<typeof currencyFormSchema>;