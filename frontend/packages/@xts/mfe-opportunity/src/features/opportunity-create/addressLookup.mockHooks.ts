// Mock-backed today, shaped like the Apollo hooks these become once a real
// address-completion API is wired in (provider/key TBD — not an internal
// master-data service, see masterData.mockHooks.ts for that pattern instead).
//
// TODO(address API): once a provider is chosen, replace the bodies of
// useCountries/useStates/useCities below with real lookups against it. Every
// consumer (Step1Details.tsx) calls these hooks, never the dummy data
// directly, so that swap is a one-file change.

const COUNTRIES = ["United States", "Canada", "United Kingdom", "India", "Other"] as const;

const STATES_BY_COUNTRY: Record<string, string[]> = {
  "United States": ["California", "Texas", "New York", "Florida", "Illinois", "Other"],
  Canada: ["Ontario", "British Columbia", "Quebec", "Alberta", "Other"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland", "Other"],
  India: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Other"],
  Other: ["Other"],
};

const CITIES_BY_COUNTRY_STATE: Record<string, string[]> = {
  "United States|California": ["Los Angeles", "San Francisco", "San Diego", "Other"],
  "United States|Texas": ["Austin", "Dallas", "Houston", "Other"],
  "United States|New York": ["New York City", "Buffalo", "Albany", "Other"],
  "United States|Florida": ["Miami", "Orlando", "Tampa", "Other"],
  "United States|Illinois": ["Chicago", "Springfield", "Other"],
  "Canada|Ontario": ["Toronto", "Ottawa", "Other"],
  "Canada|British Columbia": ["Vancouver", "Victoria", "Other"],
  "Canada|Quebec": ["Montreal", "Quebec City", "Other"],
  "Canada|Alberta": ["Calgary", "Edmonton", "Other"],
  "United Kingdom|England": ["London", "Manchester", "Other"],
  "United Kingdom|Scotland": ["Edinburgh", "Glasgow", "Other"],
  "United Kingdom|Wales": ["Cardiff", "Other"],
  "United Kingdom|Northern Ireland": ["Belfast", "Other"],
  "India|Maharashtra": ["Mumbai", "Pune", "Other"],
  "India|Karnataka": ["Bengaluru", "Mysuru", "Other"],
  "India|Delhi": ["New Delhi", "Other"],
  "India|Tamil Nadu": ["Chennai", "Coimbatore", "Other"],
  "Other|Other": ["Other"],
};

/** Mirrors: query countries: [String!]! */
export function useCountries() {
  return { data: COUNTRIES as readonly string[], loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query states(country: String!): [String!]! — empty until a
 * country is chosen; falls back to a single "Other" so a country this
 * dummy dataset doesn't cover never leaves the field an unsatisfiable
 * required Select. */
export function useStates(country: string | undefined) {
  const data = country ? (STATES_BY_COUNTRY[country] ?? ["Other"]) : [];
  return { data, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: query cities(country: String!, state: String!): [String!]! —
 * same empty-until-chosen / "Other" fallback as useStates. */
export function useCities(country: string | undefined, state: string | undefined) {
  const data = country && state ? (CITIES_BY_COUNTRY_STATE[`${country}|${state}`] ?? ["Other"]) : [];
  return { data, loading: false, error: undefined as Error | undefined };
}
