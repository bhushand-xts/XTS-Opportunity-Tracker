import { Check, FileQuestion, Layers } from "lucide-react";
import { cn } from "@xts/design-system";
import type { RfpIntakeType } from "@xts/design-system";

const CARDS: {
  type: RfpIntakeType;
  title: string;
  description: string;
  features: string[];
  icon: typeof FileQuestion;
}[] = [
  {
    type: "Questionnaire",
    title: "Questionnaire-based RFP",
    description:
      "The RFP has a structured set of questions to answer. Upload it and the system extracts each question into a response workspace.",
    features: [
      "Auto-extracts questions from the document",
      "Assign owners & route technical items to Engineering",
    ],
    icon: FileQuestion,
  },
  {
    type: "Generic",
    title: "Generic RFP",
    description:
      "The RFP asks for a full proposal or narrative rather than a fixed questionnaire. Capture the requirements and build the proposal section by section.",
    features: ["Capture required proposal volumes & sections", "Proposal outline — draft, assign & track each section"],
    icon: Layers,
  },
];

export function RfpTypeCards({ value, onChange }: { value: RfpIntakeType | null; onChange: (type: RfpIntakeType) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARDS.map((card) => {
        const selected = value === card.type;
        return (
          <button
            type="button"
            key={card.type}
            onClick={() => onChange(card.type)}
            className={cn(
              "relative rounded-lg border p-3 text-left transition-colors",
              selected ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]" : "border-border hover:border-primary/40"
            )}
          >
            <span
              className={cn(
                "absolute right-3.5 top-3.5 grid size-5 place-items-center rounded-full border",
                selected ? "border-primary bg-primary" : "border-border"
              )}
            >
              {selected && <Check className="size-3 text-primary-foreground" />}
            </span>
            <div className="mb-2.5 grid size-8 place-items-center rounded-lg bg-primary/10">
              <card.icon className="size-4 text-primary" />
            </div>
            <h3 className="text-[15px] font-semibold">{card.title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{card.description}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {card.features.map((feature) => (
                <span key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="size-3.5 shrink-0 text-emerald-600" />
                  {feature}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
