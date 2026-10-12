import { gql } from '@apollo/client';

// Implemented master-data operations only. No proposed workflow is sent live.
export const GET_OPPORTUNITY_LOOKUPS = gql`
  query OpportunityLookups {
    currencies { currencyId currencyName currencyCode isActive }
    industries { industryId industryName isActive }
    accountTypes { accountTypeId accountName isActive }
  }
`;
