import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Icon badge + a rule filling the rest of the header, matching the mockup's
// section-title treatment (icon in a tinted square, then a hairline to the
// card's edge) so every card in the wizard reads the same way.
export function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="flex w-full items-center gap-2.5">
      <span className="flex size-[26px] flex-none items-center justify-center rounded-[7px] bg-primary/10">
        <Icon className="size-[15px] text-primary" strokeWidth={1.7} />
      </span>
      {children}
      <span className="h-px flex-1 bg-border" />
    </span>
  );
}
