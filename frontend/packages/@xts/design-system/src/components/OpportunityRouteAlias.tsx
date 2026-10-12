import { Navigate, useLocation } from 'react-router-dom';
import { canonicalOpportunityPath } from '../lib/opportunityMenu';

/** Existing /opportunities links share the same MFE and stable deep routes. */
export function OpportunityRouteAlias() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: canonicalOpportunityPath(location.pathname) ?? '/opportunity', search: location.search, hash: location.hash }} />;
}
