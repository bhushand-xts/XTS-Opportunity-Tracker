import { ShieldAlert } from "lucide-react";
import { Button, Card, CardContent, OPPORTUNITY_MENU_KEY, useMenuAccess } from "@xts/design-system";
import type { ReactNode } from "react";

// Same role as AuthGate (design-system/src/components/AuthGate.tsx), one
// level down: AuthGate only checks "is someone signed in and approved" — this
// checks "does their role actually have access to this app's menu." Blocks
// direct URL navigation the same way the sidebar already hides the nav link,
// so hiding the link isn't the only thing standing between an unauthorized
// user and these pages.
export function OpportunityAccessGate({ children }: { children: ReactNode }) {
  const { loading, hasAccess } = useMenuAccess();

  if (loading) return null;

  if (!hasAccess(OPPORTUNITY_MENU_KEY)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <Card className="max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-destructive/10">
              <ShieldAlert className="size-6 text-destructive" />
            </div>
            <div>
              <p className="font-semibold">You don&apos;t have access to Opportunities</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact your administrator if you believe this is a mistake.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
