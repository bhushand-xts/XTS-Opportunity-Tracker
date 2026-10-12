import { gql } from '@apollo/client';
import type { ManagedUser } from '@xts/api-contracts';

/** Existing master-data APIs. Roles describe users; they do not grant assignment rights. */
export const GET_OPPORTUNITY_OWNER_DIRECTORY = gql`
  query GetOpportunityOwnerDirectory {
    userList {
      id
      firstName
      lastName
      email
      roleId
      isActive
    }
    rolesList {
      id
      roleName
      roleCode
      isActive
    }
  }
`;

export interface OwnerDirectoryRole {
  id: number;
  roleName: string;
  roleCode: string | null;
  isActive: boolean;
}

export interface OwnerDirectoryData {
  userList: (ManagedUser | null)[] | null;
  rolesList: (OwnerDirectoryRole | null)[] | null;
}
