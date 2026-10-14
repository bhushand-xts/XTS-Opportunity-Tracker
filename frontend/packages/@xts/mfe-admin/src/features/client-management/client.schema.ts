import { z } from "zod";
import { ROLE_IN_DECISION_OTHER } from "@xts/api-contracts";

// Limits match the live column sizes of mst_client / tbl_client_contact_person
// (checked directly against the database — street_address really is this short).
// Every field is required except website; roleInDecisionOther is required
// only when "Other" is the selected role (enforced below via refine).
const contactSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(255, "Full name must be at most 255 characters"),
    titleRole: z.string().trim().min(1, "Title / role is required").max(150, "Title / role must be at most 150 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .max(255, "Email must be at most 255 characters")
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address"),
    phone: z.string().trim().min(1, "Phone is required").max(20, "Phone must be at most 20 characters"),
    roleInDecision: z.string().trim().min(1, "Role in decision is required"),
    roleInDecisionOther: z.string().trim().max(255, "Must be at most 255 characters").optional(),
  })
  .refine((data) => data.roleInDecision !== String(ROLE_IN_DECISION_OTHER) || !!data.roleInDecisionOther?.trim(), {
    message: "Please specify the role",
    path: ["roleInDecisionOther"],
  });

export const clientFormSchema = z.object({
  clientName: z.string().trim().min(1, "Organization / account name is required").max(255, "Must be at most 255 characters"),
  accountType: z.string().trim().min(1, "Account type is required"),
  sector: z.string().trim().min(1, "Sector / industry is required"),
  website: z.string().trim().max(500, "Website must be at most 500 characters").optional(),
  city: z.string().trim().min(1, "City is required").max(100, "City must be at most 100 characters"),
  state: z.string().trim().min(1, "State / province is required").max(100, "State / province must be at most 100 characters"),
  country: z.string().trim().min(1, "Country is required").max(100, "Country must be at most 100 characters"),
  streetAddress: z.string().trim().min(1, "Street address is required").max(20, "Street address must be at most 20 characters"),
  isActive: z.boolean(),
  contacts: z.array(contactSchema).min(1, "At least one contact is required"),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ClientContactFormValues = z.infer<typeof contactSchema>;

export const EMPTY_CONTACT: ClientContactFormValues = {
  fullName: "",
  titleRole: "",
  email: "",
  phone: "",
  roleInDecision: "",
  roleInDecisionOther: "",
};

export const EMPTY_CLIENT_FORM: ClientFormValues = {
  clientName: "",
  accountType: "",
  sector: "",
  website: "",
  city: "",
  state: "",
  country: "",
  streetAddress: "",
  isActive: true,
  contacts: [EMPTY_CONTACT],
};
