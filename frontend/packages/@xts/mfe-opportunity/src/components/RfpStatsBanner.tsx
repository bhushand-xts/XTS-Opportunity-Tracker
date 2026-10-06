import type { LucideIcon } from "lucide-react";

export interface RfpStatsBannerStat {
  label: string;
  value: string | number;
}

// Shared visual banner for the top of both RFP path's main workspace pages
// (Question Review, Proposal Outline) so the two paths read as one product.
export function RfpStatsBanner({
  icon: Icon,
  title,
  subtitle,
  stats,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  stats: RfpStatsBannerStat[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-gradient-to-r from-sidebar to-sidebar-accent px-5 py-4 text-sidebar-foreground">
      <div className="grid size-10 flex-none place-items-center rounded-lg bg-sidebar-foreground/15">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-sidebar-foreground/75">{subtitle}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-6 text-right">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-[11px] text-sidebar-foreground/70">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
