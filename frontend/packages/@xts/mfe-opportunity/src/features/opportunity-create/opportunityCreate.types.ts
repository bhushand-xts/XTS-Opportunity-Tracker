import type { AccountType, CurrencyCode, DecisionRole, Priority, Relationship, RfpIntakeType, Sector, ServiceLine } from "@xts/design-system";

// Everything Step 1 ("Details & type") collects. Carried across the wizard's
// routes by OpportunityCreateContext until a later phase's real intake step
// actually commits an Opportunity/Customer to the shared store.

export interface ContactDraft {
  key: string; // stable key for react-hook-form's useFieldArray, not a persisted id
  name: string;
  title: string;
  email: string;
  phone: string;
  decisionRole: DecisionRole | "";
}

export interface OpportunityDraft {
  // Opportunity
  title: string;
  value: string;
  currency: CurrencyCode;
  serviceLine: ServiceLine | "";
  source: string;
  ownerId: string;
  priority: Priority | "";

  // Client & account
  accountName: string;
  relationship: Relationship | "";
  accountType: AccountType | "";
  sector: Sector | "";
  website: string;
  city: string;
  state: string;
  country: string;
  address: string;

  // Primary contact(s)
  contacts: ContactDraft[];

  // RFP type
  rfpType: RfpIntakeType | null;
}
