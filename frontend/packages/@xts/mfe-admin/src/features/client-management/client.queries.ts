import { gql } from "@apollo/client";

const CLIENT_CONTACT_FIELDS = gql`
  fragment ClientContactFields on ClientContact {
    id
    clientId
    fullName
    titleRole
    email
    phone
    roleInDecision
    roleInDecisionOther
    contactSequence
    isActive
  }
`;

const CLIENT_FIELDS = gql`
  fragment ClientFields on Client {
    id
    clientName
    accountType
    sector
    website
    city
    state
    country
    streetAddress
    isActive
    createdDt
    updatedDt
    contacts {
      ...ClientContactFields
    }
  }
  ${CLIENT_CONTACT_FIELDS}
`;

export const GET_CLIENTS = gql`
  query GetClients {
    clientsList {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const CREATE_CLIENT = gql`
  mutation CreateClient($input: CreateClientInput!) {
    createClient(input: $input) {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: Int!, $input: UpdateClientInput!) {
    updateClient(id: $id, input: $input) {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: Int!, $updatedBy: Int) {
    deleteClient(id: $id, updatedBy: $updatedBy)
  }
`;

export const GET_CLIENT_HISTORY = gql`
  query GetClientHistory($clientId: Int!) {
    clientHistory(clientId: $clientId) {
      trackerId
      clientId
      clientName
      accountType
      sector
      website
      city
      state
      country
      streetAddress
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
