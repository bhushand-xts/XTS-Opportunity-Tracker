import { useMemo, useState } from "react";
import { Lock, Pencil, Plus, Search } from "lucide-react";
import type { Industry } from "@xts/api-contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useAuth,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import {
  ErrorNotice,
  TableEmptyRow,
  TableLoadingRows,
} from "../../components/TableStates";
import { IndustryFormDialog } from "./IndustryFormDialog";
import { useIndustries } from "./useIndustries";
import { useIndustryMutations } from "./useIndustryMutations";

const COLUMNS = 5;
const MENU_KEY = "industry_master";

export function IndustryMasterPage() {
  useSetPageTitle("Industry Master");

  const { industries, loading, error } = useIndustries();
  const { setIndustryActive } = useIndustryMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);
  const [search, setSearch] = useState("");

  const visibleIndustries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return industries;

    return industries.filter((industry) =>
      `${industry.industryName} ${industry.description ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [industries, search]);

  function openAdd() {
    setEditingIndustry(null);
    setDialogOpen(true);
  }

  function openEdit(industry: Industry) {
    setEditingIndustry(industry);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage industries."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search industries"
                aria-label="Search industries"
                className="pl-9"
              />
            </div>

            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add industry
              </Button>
            )}
          </>
        }
      />

      {error && (
        <ErrorNotice error={error} title="Couldn't load industries" />
      )}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Industry Master.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Industry name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}

                {!loading && !error && industries.length === 0 && (
                  <TableEmptyRow
                    columns={COLUMNS}
                    message="No industries yet. Add the first one."
                  />
                )}

                {!loading &&
                  industries.length > 0 &&
                  visibleIndustries.length === 0 && (
                    <TableEmptyRow
                      columns={COLUMNS}
                      message="No industries match your search."
                    />
                  )}

                {visibleIndustries.map((industry) => (
                  <TableRow key={industry.industryId}>
                    <TableCell className="font-medium">
                      {industry.industryName}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {industry.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={industry.isActive ? "success" : "muted"}
                      >
                        {industry.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={industry.isActive}
                        disabled={!canEdit}
                        aria-label={`${industry.isActive ? "Deactivate" : "Activate"} ${industry.industryName}`}
                        onCheckedChange={(checked) =>
                          void setIndustryActive(industry.industryId, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${industry.industryName}`}
                          onClick={() => openEdit(industry)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <IndustryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        industry={editingIndustry}
        allIndustries={industries}
      />
    </div>
  );
}
