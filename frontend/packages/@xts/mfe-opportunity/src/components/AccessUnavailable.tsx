import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@xts/design-system';

export function AccessUnavailable({ page, changed = false, destination }: {
  page: string;
  changed?: boolean;
  destination?: { path: string; label: string };
}) {
  return <div className="opp-page">
    <section role="status" aria-labelledby="access-unavailable-title" className="mx-auto my-10 max-w-lg rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
      <ShieldCheck className="mx-auto mb-4 size-9 text-muted-foreground" aria-hidden="true" />
      <h2 id="access-unavailable-title" className="text-xl font-semibold">{changed ? 'Your access has changed' : 'Access unavailable'}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{changed ? `You no longer have access to ${page}. Your permissions have been updated.` : `You do not currently have access to ${page}.`}</p>
      <p className="mt-2 text-sm text-muted-foreground">You can continue using the pages available in the menu. Contact your administrator if you need access.</p>
      {destination && <Button asChild className="mt-6"><Link to={destination.path}>{destination.label}</Link></Button>}
    </section>
  </div>;
}
