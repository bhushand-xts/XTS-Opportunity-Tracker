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

// Existing read-only APIs used by frontend-only workflow testing with real logins.
export const GET_LOCAL_WORKFLOW_DIRECTORY = gql`
  query OpportunityLocalWorkflowDirectory {
    currentUserId
    userList { id firstName lastName email roleId isActive }
    rolesList { id roleName roleCode isActive }
    menus(asTree: false) { menuId menuName menuKey icon parentId sortOrder routePath isActive }
    rfpQuestionsList { id question description displayOrder isActive createdDt updatedDt }
  }
`;
export const GET_LOCAL_WORKFLOW_ROLE_ACCESS = gql`
  query OpportunityLocalRoleAccess($roleId: Int!) {
    roleAccess(roleId: $roleId) { menuKey permissionKey }
  }
`;
