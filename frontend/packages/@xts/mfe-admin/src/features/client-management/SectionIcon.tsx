import type { LucideIcon } from "lucide-react";
import { cn } from "@xts/design-system";

const COLORS: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
};

/** The small colored icon badge in front of a form section's heading. */
export function SectionIcon({ icon: Icon, color }: { icon: LucideIcon; color: keyof typeof COLORS }) {
  return (
    <span className={cn("flex size-6 items-center justify-center rounded-md", COLORS[color])}>
      <Icon className="size-3.5" />
    </span>
  );
}
