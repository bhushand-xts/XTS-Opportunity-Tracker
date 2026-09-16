import { Button, Card, CardContent, CardHeader, CardTitle, useAuth, useSetPageTitle } from "@xts/design-system";

export function AdminOverview() {
  useSetPageTitle("Administration");
  const { session, profile, signOut } = useAuth();
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : session?.email;

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-end gap-4 border-b pb-5">
        <span className="text-sm text-muted-foreground">{session?.email}</span>
        <Button variant="outline" size="sm" onClick={() => void signOut()}>
          Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Welcome, {displayName}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This MFE is loaded dynamically via Module Federation!</p>
          <ul className="list-disc pl-5">
            <li>Manage users</li>
            <li>Manage roles and permissions</li>
            <li>View audit logs</li>
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">Running on port 3001</p>
        </CardContent>
      </Card>
    </div>
  );
}
