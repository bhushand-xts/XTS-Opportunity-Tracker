import { useNavigate } from "react-router-dom";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatMoney,
  useSetPageTitle,
  useStore,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";

const COLUMNS = 7;

// Serves both "All Opportunities" and "My Opportunities" — same table, just
// filtered differently. Rows navigate to the new Opportunity Details page.
export function OpportunityListPage({ mineOnly }: { mineOnly: boolean }) {
  useSetPageTitle(mineOnly ? "My opportunities" : "All opportunities");
  const navigate = useNavigate();
  const { opportunities, customers, users, currentUser } = useStore();

  const rows = (mineOnly ? opportunities.filter((o) => o.ownerId === currentUser.id) : opportunities).slice();

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={mineOnly ? "Opportunities you own." : "Every opportunity across the pipeline."}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>RFP type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Expected close</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-muted-foreground">
                  {mineOnly ? "You don't own any opportunities yet." : "No opportunities yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => (
              <TableRow
                key={o.id}
                className="cursor-pointer"
                onClick={() => navigate(`/opportunities/${o.id}`)}
              >
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customers.find((c) => c.id === o.customerId)?.name ?? "—"}
                </TableCell>
                <TableCell>
                  {o.rfpType ? (
                    <Badge variant={o.rfpType === "Questionnaire" ? "default" : "secondary"} className="text-[10px]">
                      {o.rfpType}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{o.stage}</TableCell>
                <TableCell>{formatMoney(o.value)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {users.find((u) => u.id === o.ownerId)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{o.expectedClose || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
