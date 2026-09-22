import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small icon chip + description row used at the top of Admin Master
 * screens — the same icon/color treatment as their Empty states, so a
 * screen's identity (Menu/Permission/Role/...) reads consistently whether
 * the list has data or not. `actions` is typically the page's "Add" button. */
export function PageHeader({
  icon: Icon,
  description,
  actions,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-4" />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}
