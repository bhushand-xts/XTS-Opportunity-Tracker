import { Card, CardContent, useSetPageTitle } from "@xts/design-system";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  useSetPageTitle(title);
  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted-foreground">{description ?? "This section hasn't been built yet."}</p>
      <Card>
        <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
