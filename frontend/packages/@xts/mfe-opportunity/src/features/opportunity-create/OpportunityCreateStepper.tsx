import { Check } from "lucide-react";
import { cn } from "@xts/design-system";

const STEPS = ["Details & Type", "Upload & Extract", "Respond"] as const;

export function OpportunityCreateStepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, index) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border-[1.5px] text-xs",
                index < current && "border-emerald-600 bg-emerald-600 text-white",
                index === current && "border-primary bg-primary text-primary-foreground",
                index > current && "border-muted-foreground/30 bg-background text-muted-foreground"
              )}
            >
              {index < current ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={index <= current ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </div>
          {index < STEPS.length - 1 && (
            <div className={cn("mx-3 h-0.5 flex-1", index < current ? "bg-emerald-600" : "bg-muted-foreground/20")} />
          )}
        </div>
      ))}
    </div>
  );
}
