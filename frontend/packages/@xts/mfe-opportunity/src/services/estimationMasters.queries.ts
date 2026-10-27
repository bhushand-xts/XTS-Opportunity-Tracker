import { gql } from '@apollo/client';

// Admin-owned master data (rate master, estimation phases), reached through the
// same gateway/schema as every other Opportunity query — see GET_OPPORTUNITY_LOOKUPS
// for the existing precedent of combining admin-owned root fields in one query.
export const GET_ESTIMATION_MASTERS = gql`
  query OpportunityEstimationMasters {
    estimationPhasesList { id phaseName phaseCode displayOrder isActive }
    rateMasters { ratemasterId roleName roleCode currencyId rateType defaultRate isActive }
    currencies { currencyId currencyCode currencySymbol isActive }
  }
`;

// Same mutation the admin Rate Master screen uses (updateRateMaster is a full
// replace — UpdateRateMasterInput requires every field, not just the one
// being changed, so callers must carry the other fields over unmodified).
export const UPDATE_RATE_MASTER = gql`
  mutation OpportunityUpdateRateMaster($ratemasterId: Int!, $input: UpdateRateMasterInput!) {
    updateRateMaster(ratemasterId: $ratemasterId, input: $input) { ratemasterId roleName roleCode currencyId rateType defaultRate isActive }
  }
`;
