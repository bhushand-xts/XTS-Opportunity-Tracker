// Mirrors the admin service's `Client`/`ClientContact` types
// (backend/services/admin/src/graphql/typeDefs/client.typeDefs.ts).

export interface ClientContact {
  id: number;
  clientId: number;
  fullName: string;
  titleRole: string | null;
  email: string | null;
  phone: string | null;
  roleInDecision: number | null;
  roleInDecisionOther: string | null;
  contactSequence: number | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
}

export interface Client {
  id: number;
  clientName: string;
  accountType: string | null;
  sector: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  streetAddress: string | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
  contacts: ClientContact[];
}

export interface ClientContactInput {
  fullName: string;
  titleRole?: string | null;
  email?: string | null;
  phone?: string | null;
  roleInDecision?: number | null;
  roleInDecisionOther?: string | null;
}

export interface ClientInput {
  clientName: string;
  accountType?: string | null;
  sector?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  streetAddress?: string | null;
  isActive?: boolean;
  contacts?: ClientContactInput[];
  /** The signed-in user, recorded as created_by / updated_by. */
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of a client's change history (mst_client_tracker): the client
 * as it stood after a change. Newest first. */
export interface ClientHistory {
  trackerId: number;
  clientId: number;
  clientName: string;
  accountType: string | null;
  sector: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  streetAddress: string | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

// role_in_decision is a fixed application-level enum, not backed by a
// lookup table (see schema.sql's note on tbl_client_contact_person). Value
// 10 ("Other") is the one the UI treats specially, revealing the free-text
// roleInDecisionOther field.
export const ROLE_IN_DECISION_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Procurement / Buyer" },
  { value: 2, label: "Decision Maker" },
  { value: 3, label: "Influencer" },
  { value: 4, label: "Technical Evaluator" },
  { value: 5, label: "End User" },
  { value: 6, label: "Approver" },
  { value: 7, label: "Legal/Compliance" },
  { value: 8, label: "Finance" },
  { value: 9, label: "Stakeholder" },
  { value: 10, label: "Other" },
];

export const ROLE_IN_DECISION_OTHER = 10;
