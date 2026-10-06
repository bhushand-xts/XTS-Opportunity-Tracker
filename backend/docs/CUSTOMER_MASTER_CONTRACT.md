# Client/Customer Master — GraphQL contract (PROPOSED, not implemented yet)

Everything in this document is a **proposal for the backend team to implement**, not a description of running code. The frontend (`frontend/packages/@xts/mfe-opportunity/src/features/opportunity-create/`) is built against a mock, in-memory store today — see `ClientCombobox.tsx` and `Step1Details.tsx`, whose `addCustomer`/`updateCustomer` calls are shaped to become `createCustomer`/`updateCustomer` mutations below with no consuming-component changes needed once wired to a real backend.

**Where this plugs in:** `backend/services/opportunity` (port 4003) — same service already extended by `backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md`. A `Customer` belongs here rather than a new service because it's only ever created/edited in the context of an `Opportunity` in this app.

**Not covered here:** the Mapbox (or similar) address-autocomplete integration discussed for the Street Address field is a separate, client-side-only concern (a third-party API call, not a backend operation) and isn't part of this contract.

---

## Proposed types

```graphql
type Customer {
  id: Int!
  name: String!
  relationship: String!   # "New client" | "Existing client" | "Repeat / renewal"
  accountType: String!
  sector: String!
  website: String
  city: String!
  state: String
  country: String!
  address: String
  createdDt: String
  updatedDt: String
}

input CreateCustomerInput {
  name: String!
  relationship: String!
  accountType: String!
  sector: String!
  website: String
  city: String!
  state: String
  country: String!
  address: String
  createdBy: Int
}

input UpdateCustomerInput {
  name: String
  relationship: String
  accountType: String
  sector: String
  website: String
  city: String
  state: String
  country: String
  address: String
  updatedBy: Int
}
```

## Proposed operations

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `searchCustomers` (Q) | `query: String!` | `[Customer!]!` | Case-insensitive substring match on `name`. Empty/whitespace `query` returns the full list (the frontend's combobox shows all customers when the field is empty) |
| `createCustomer` (M) | `input: CreateCustomerInput!` | `Customer!` | Powers the combobox's "Create '<name>'" option |
| `updateCustomer` (M) | `id: Int!`, `input: UpdateCustomerInput!` | `Customer!` | Called when a wizard user selects an *existing* customer and edits any of its fields before submitting Step 1 — saves those edits back onto the shared record rather than creating a duplicate |

`createdBy`/`updatedBy` follow the same convention as every other service in this repo: optional, recorded from the signed-in user's token when present.

## Example payloads

```graphql
query {
  searchCustomers(query: "acme") {
    id name relationship accountType sector website city state country address
  }
}

mutation {
  createCustomer(input: {
    name: "Acme Agency"
    relationship: "New client"
    accountType: "Government — State"
    sector: "Transportation"
    city: "Austin"
    country: "United States"
  }) {
    id name
  }
}

mutation {
  updateCustomer(id: 7, input: { city: "Dallas", website: "https://acme-dallas.gov" }) {
    id city website
  }
}
```

## Suggested table (illustrative — final naming is the backend team's call)

```sql
CREATE TABLE mst_customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  account_type VARCHAR(100) NOT NULL,
  sector VARCHAR(100) NOT NULL,
  website VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  address VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);
CREATE INDEX ix_mst_customers_name ON mst_customers (LOWER(name));
```

## Not covered by this document

Address autocomplete (a separate, client-side third-party API integration — provider not yet selected/wired), and any dedicated "client master management" screen for editing a customer outside the context of creating/editing an opportunity, are **not** in scope here.
