import { z } from "zod";

// Letters, numbers, spaces, and -, /, & — nothing else.
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-/&]*$/;

export const accountTypeFormSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(1, "Account Type Name is required")
    .min(3, "Must be at least 3 characters long.")
    .max(100, "Account Type Name must be at most 100 characters")
    .regex(ALLOWED_CHARS, "Only letters, numbers, spaces, hyphens (-), slashes (/) and ampersands (&) are allowed."),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  isActive: z.boolean(),
});

export type AccountTypeFormValues = z.infer<typeof accountTypeFormSchema>;
