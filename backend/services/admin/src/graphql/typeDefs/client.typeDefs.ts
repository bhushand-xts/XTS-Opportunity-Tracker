export default `
  # A client/account (mst_client) and its contact people — the Client Master
  # admin screen. Every save of a client replaces its whole contacts list
  # (soft-deletes the ones no longer present, inserts the submitted ones
  # fresh) rather than diffing individual contacts in place.
  type ClientContact {
    id: Int!
    clientId: Int!
    fullName: String!
    titleRole: String
    email: String
    phone: String
    roleInDecision: Int
    roleInDecisionOther: String
    contactSequence: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  type Client {
    id: Int!
    clientName: String!
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
    contacts: [ClientContact!]!
  }

  # One entry of a client's change history (mst_client_tracker), newest first.
  type ClientHistory {
    trackerId: Int!
    clientId: Int!
    clientName: String!
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input ClientContactInput {
    fullName: String!
    titleRole: String
    email: String
    phone: String
    roleInDecision: Int
    roleInDecisionOther: String
  }

  input CreateClientInput {
    clientName: String!
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    isActive: Boolean
    contacts: [ClientContactInput!]
    createdBy: Int
  }

  # Every field optional (a partial update, like the quick Active/Inactive
  # toggle) except that when "contacts" is included at all, it replaces the
  # whole list — omit it to leave existing contacts untouched.
  input UpdateClientInput {
    clientName: String
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    isActive: Boolean
    contacts: [ClientContactInput!]
    updatedBy: Int
  }

  extend type Query {
    clientsList: [Client]
    client(id: Int!): Client
    clientHistory(clientId: Int!): [ClientHistory!]!
  }

  extend type Mutation {
    createClient(input: CreateClientInput!): Client
    updateClient(id: Int!, input: UpdateClientInput!): Client
    deleteClient(id: Int!, updatedBy: Int): Boolean
  }
`;
