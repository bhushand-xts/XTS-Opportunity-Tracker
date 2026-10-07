import { LayoutDashboard } from "lucide-react";
import { Card, CardContent, useSetPageTitle } from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";

// Dashboard used to just re-render the Pipeline board; now that Pipeline is
// its own entry under Opportunities, this slot is reserved for a real
// cross-cutting KPI/analytics home screen later — a placeholder until then,
// same treatment as other not-yet-built areas rather than faked data.
export function DashboardPlaceholderPage() {
  useSetPageTitle("Dashboard");
  return (
    <div className="space-y-4 p-5">
      <PageHeader description="Your personalized overview." />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/10">
            <LayoutDashboard className="size-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Dashboard is coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A personalized KPI overview will appear here. Use Opportunities in the sidebar for now.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
