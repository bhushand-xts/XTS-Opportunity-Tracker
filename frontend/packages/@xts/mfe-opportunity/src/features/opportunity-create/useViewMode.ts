import { useEffect, useState } from "react";

export type ViewMode = "vertical" | "horizontal";

const VIEW_MODE_KEY = "step1-view-mode";

// Per-viewer layout preference only — never anything the store/backend needs
// to know about. Guarded since localStorage can throw (private browsing, etc).
function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === "horizontal" ? "horizontal" : "vertical";
  } catch {
    return "vertical";
  }
}

// Shared across the whole New Opportunity wizard (Step 1, Questionnaire
// intake, Generic intake) so picking horizontal once carries through every
// page instead of resetting per screen.
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Per-viewer convenience only — fine to silently skip if storage is unavailable.
    }
  }, [viewMode]);

  return [viewMode, setViewMode];
}
