/**
 * Placeholder domain types and seed data — SCAFFOLDING.
 * Ported alongside AppShell/DashboardContent/etc. so they type-check and
 * render with something on screen. Replace with real domain types and data
 * sourced from @xts/api-contracts / @xts/api-client before shipping.
 */

export const STAGES = ["Identified", "Qualified", "Proposal", "Negotiation", "Closed"] as const;
export type Stage = (typeof STAGES)[number];

export type Role = "Sales Rep" | "Sales Manager" | "Sales Head" | "System Admin";

export type OpportunityType = "New Business" | "Renewal" | "Upsell";

export interface OpportunityClosure {
  outcome: "Won" | "Lost" | "Hold";
  [field: string]: string;
}

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  contactName: string;
  ownerId: string;
  team: string;
  source: string;
  type: OpportunityType;
  value: number;
  currency: string;
  probability: number;
  expectedClose: string;
  stage: Stage;
  requirements: string;
  tags: string[];
  closure?: OpportunityClosure;
}

export type ActivityType = "Call" | "Meeting" | "Email" | "Task" | "Note" | "Follow-up";

export interface Activity {
  id: string;
  opportunityId: string;
  type: ActivityType;
  subject: string;
  notes: string;
  date: string;
  userId: string;
  done?: boolean;
}

export interface Approval {
  id: string;
  opportunityId: string;
  type: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedBy: string;
}

export interface HistoryEntry {
  id: string;
  opportunityId: string;
  what: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
}

export interface StoreUser {
  id: string;
  name: string;
  team: string;
}

export const LOST_REASONS = ["Budget", "Timing", "Competitor", "No decision", "Requirements mismatch"];
