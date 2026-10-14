import { z } from "zod";

// Letters, numbers, spaces, and -, /, & — nothing else (blocks HTML/injection
// characters like < > { } [ ] $ % as a side effect of the allow-list).
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-/&]*$/;

export const industryFormSchema = z.object({
  industryName: z
    .string()
    .trim()
    .min(1, "Industry Name is required")
    .min(2, "Industry name must be at least 2 characters long.")
    .max(100, "Industry Name must be at most 100 characters")
    .regex(ALLOWED_CHARS, "Invalid characters detected."),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  isActive: z.boolean(),
});

export type IndustryFormValues = z.infer<typeof industryFormSchema>;
