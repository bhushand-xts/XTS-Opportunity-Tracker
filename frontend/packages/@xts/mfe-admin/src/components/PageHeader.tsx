import type { ReactNode } from "react";

/** Intro line and primary action shown at the top of every admin page. The
 * page title itself lives in the app shell's header (see useSetPageTitle). */
export function PageHeader({ description, actions }: { description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
