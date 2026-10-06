import {
  ACCOUNT_TYPES,
  CURRENCIES,
  DECISION_ROLES,
  OPPORTUNITY_SOURCES,
  PRIORITIES,
  RELATIONSHIPS,
  SECTORS,
  SERVICE_LINES,
} from "@xts/design-system";

// Mock-backed today, shaped like the Apollo hooks these become once a master-
// data service exists — see backend/docs/MASTER_DATA_CONTRACT.md. Every Select
// in Step 1 that's meant to be admin-managed reads through one of these hooks
// instead of importing its constant array directly, so swapping a hook's body
// for a real `useQuery(...)` later is a one-file change — nothing in
// Step1Details.tsx (or any other consumer) needs to change.

/** Mirrors: query currencies: [Currency!]! */
export function useCurrencies() {
  return { data: CURRENCIES, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query serviceLines: [ServiceLine!]! */
export function useServiceLines() {
  return { data: SERVICE_LINES, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query opportunitySources: [OpportunitySource!]! */
export function useOpportunitySources() {
  return { data: OPPORTUNITY_SOURCES, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query relationshipTypes: [RelationshipType!]! */
export function useRelationshipTypes() {
  return { data: RELATIONSHIPS, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query accountTypes: [AccountType!]! */
export function useAccountTypes() {
  return { data: ACCOUNT_TYPES, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query sectors: [Sector!]! */
export function useSectors() {
  return { data: SECTORS, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query decisionRoles: [DecisionRole!]! */
export function useDecisionRoles() {
  return { data: DECISION_ROLES, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query priorities: [Priority!]! */
export function usePriorities() {
  return { data: PRIORITIES, loading: false, error: undefined as Error | undefined };
}
