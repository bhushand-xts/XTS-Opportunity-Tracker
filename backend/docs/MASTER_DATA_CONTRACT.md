# Opportunity-creation master data — GraphQL contract (PROPOSED, not implemented yet)

Everything in this document is a **proposal for the backend team to implement**, not a description of running code. The frontend (`frontend/packages/@xts/mfe-opportunity/src/features/opportunity-create/masterData.mockHooks.ts`) is built against hardcoded constant arrays today, wrapped in small hooks shaped like the real Apollo `useQuery` calls below — so wiring these up later is a one-file change inside `masterData.mockHooks.ts`; `Step1Details.tsx` (or any other consumer) doesn't change at all.

**Where this plugs in:** wherever the backend team hosts shared reference/master data — plausibly a new `master-data` service, or a module inside an existing one. Not prescribed here; these are simple, mostly-static lookup lists, not opportunity-specific records.

**Covers:** Currency, Service Line, Opportunity Source, Relationship Type, Account Type, Sector/Industry, Role in Decision, Priority — every "select from configured master data" field named in the opportunity-creation user story's business rules.

**Not covered here:**
- **Owner** — not a new master. It's the existing, already-real `userList` query (see `frontend/packages/@xts/mfe-opportunity/src/features/rfp-questions/useRealUsers.ts`), already filtered to active users. Restricting it further to a "Sales/BD" role specifically needs the user service to expose a resolved role *name* for `ManagedUser.roleId` (currently just a bare, unresolved id — see `AppShell.tsx`'s own comments on this same gap) — that's a user-service enhancement, not a new master-data type.
- **Country / State / City** — intentionally excluded. These will eventually come from a third-party address-completion API (provider not yet chosen), not an internally-managed master table. See `frontend/packages/@xts/mfe-opportunity/src/features/opportunity-create/addressLookup.mockHooks.ts` for that swap point instead.

---

## Proposed types

Every list here follows the same shape: a stable `code` (used as the field's stored value) and a display `label`. For most of these the two are identical today (e.g. `"Transportation"` / `"Transportation"`) — keeping them distinct from the start avoids a breaking rename later if a label ever needs to change independently of the stored value.

```graphql
type MasterListItem {
  code: String!
  label: String!
}

type Currency {
  code: String!   # ISO 4217, e.g. "USD"
  label: String!  # e.g. "USD ($)"
}
```

`ServiceLine`, `OpportunitySource`, `RelationshipType`, `AccountType`, `Sector`, `DecisionRole`, and `Priority` are each just `MasterListItem` — not redefined individually below to avoid repeating the same two-field shape seven times.

## Proposed operations

| Operation | Returns | Mirrors (frontend hook) |
|---|---|---|
| `currencies` (Q) | `[Currency!]!` | `useCurrencies()` |
| `serviceLines` (Q) | `[MasterListItem!]!` | `useServiceLines()` |
| `opportunitySources` (Q) | `[MasterListItem!]!` | `useOpportunitySources()` |
| `relationshipTypes` (Q) | `[MasterListItem!]!` | `useRelationshipTypes()` |
| `accountTypes` (Q) | `[MasterListItem!]!` | `useAccountTypes()` |
| `sectors` (Q) | `[MasterListItem!]!` | `useSectors()` |
| `decisionRoles` (Q) | `[MasterListItem!]!` | `useDecisionRoles()` |
| `priorities` (Q) | `[MasterListItem!]!` | `usePriorities()` |

All read-only, all basically static (changes rarely, admin-managed) — no mutations proposed here since there's no admin screen for editing these yet (the only precedent for that pattern in this app is the Generic RFP Question Master in `mfe-admin`). If/when an admin CRUD screen for these is wanted, the obvious next step is `create<X>`/`update<X>`/`delete<X>` mutations per list, same shape as that screen's own contract.

## Example payloads

```graphql
query {
  currencies { code label }
  serviceLines { code label }
  opportunitySources { code label }
}
```

```json
{
  "data": {
    "currencies": [
      { "code": "USD", "label": "USD ($)" },
      { "code": "EUR", "label": "EUR (€)" }
    ],
    "serviceLines": [
      { "code": "Data & platform engineering", "label": "Data & platform engineering" }
    ],
    "opportunitySources": [
      { "code": "Public procurement portal", "label": "Public procurement portal" },
      { "code": "Other", "label": "Other" }
    ]
  }
}
```

## Suggested tables (illustrative — final naming is the backend team's call)

One table per list, or a single generic table keyed by list name — either works; a single generic table is shown since these are all identically-shaped:

```sql
CREATE TABLE mst_opportunity_lists (
  id SERIAL PRIMARY KEY,
  list_name VARCHAR(50) NOT NULL,   -- 'currency' | 'service_line' | 'opportunity_source' | ...
  code VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX ix_mst_opportunity_lists_name_code ON mst_opportunity_lists (list_name, code);
```

## Not covered by this document

Owner/active-Sales-BD-user filtering (a user-service enhancement, not a new master), Country/State/City (pending a third-party address API, not an internal master), and any admin CRUD UI for managing these lists (no mutations proposed — read-only for now) are **not** in scope here.
