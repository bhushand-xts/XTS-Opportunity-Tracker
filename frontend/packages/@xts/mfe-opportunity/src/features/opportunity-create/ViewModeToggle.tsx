import { LayoutGrid, Rows3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@xts/design-system";
import type { ViewMode } from "./useViewMode";

export function ViewModeToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={viewMode}
      onValueChange={(v) => {
        if (v) onChange(v as ViewMode);
      }}
    >
      <ToggleGroupItem value="vertical" aria-label="Vertical view">
        <Rows3 className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="horizontal" aria-label="Horizontal view">
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
