import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RegistrationPendingView({
  firstName,
  onSignOut,
}: {
  firstName?: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to shadow-lg">
            <Clock className="size-7 text-brand-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Opportunity Tracker</h1>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="space-y-4 pt-6 text-center">
            <h2 className="text-base font-semibold text-foreground">
              {firstName ? `Thanks, ${firstName} — your account is pending approval` : "Your account is pending approval"}
            </h2>
            <p className="text-sm text-muted-foreground">
              An administrator needs to assign you a role before you can access the application. You&apos;ll be able to
              sign in normally once that&apos;s done.
            </p>
            <Button variant="outline" className="h-11 w-full" onClick={onSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
