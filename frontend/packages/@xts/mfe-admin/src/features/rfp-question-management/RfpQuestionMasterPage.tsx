import { useMemo, useState } from "react";
import { Ban, CheckCircle2, History, Pencil, Plus, Search } from "lucide-react";
import type { RfpQuestion } from "@xts/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { RfpQuestionFormDialog } from "./RfpQuestionFormDialog";
import { RfpQuestionHistoryDialog } from "./RfpQuestionHistoryDialog";
import { useRfpQuestionCategories } from "./rfpQuestionCategories";
import { useRfpQuestionMutations } from "./useRfpQuestionMutations";
import { useRfpQuestions } from "./useRfpQuestions";

const COLUMNS = 7;
const ALL = "all";

export function RfpQuestionMasterPage() {
  useSetPageTitle("Generic RFP Question Master");
  const { questions, loading, error } = useRfpQuestions();
  const { categories } = useRfpQuestionCategories();
  const { setQuestionActive } = useRfpQuestionMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<RfpQuestion | null>(null);
  const [historyQuestion, setHistoryQuestion] = useState<RfpQuestion | null>(null);
  const [deactivatingQuestion, setDeactivatingQuestion] = useState<RfpQuestion | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const visibleQuestions = useMemo(() => {
    const text = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (text && !item.question.toLowerCase().includes(text)) return false;
      if (categoryFilter !== ALL && String(item.categoryId ?? "") !== categoryFilter) return false;
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      return true;
    });
  }, [questions, search, categoryFilter, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter(ALL);
    setStatusFilter(ALL);
  };

  const openAdd = () => {
    setEditingQuestion(null);
    setDialogOpen(true);
  };
  const openEdit = (question: RfpQuestion) => {
    setEditingQuestion(question);
    setDialogOpen(true);
  };

  const confirmDeactivate = () => {
    if (!deactivatingQuestion) return;
    void setQuestionActive(deactivatingQuestion.id, false);
    setDeactivatingQuestion(null);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Manage reusable standard questions for RFP processes."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                aria-label="Search RFP questions"
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAdd}>
              <Plus className="mr-2 size-4" />
              Add Question
            </Button>
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Unable to load generic RFP questions" />}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description / Guidance</TableHead>
                <TableHead>Display order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}
              {!loading && !error && questions.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No generic RFP questions found. Add the first one." />
              )}
              {!loading && questions.length > 0 && visibleQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-muted-foreground">
                    <p>No questions match your current filters.</p>
                    <Button variant="link" className="h-auto p-0 text-sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {visibleQuestions.map((item, index) => (
                <TableRow key={item.id} className={item.isActive ? undefined : "text-muted-foreground"}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="max-w-md font-medium">{item.question}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{item.categoryName ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{item.description ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{item.displayOrder ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "success" : "muted"}>{item.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`History of question "${item.question}"`}
                      onClick={() => setHistoryQuestion(item)}
                    >
                      <History className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit question "${item.question}"`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {item.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Deactivate question "${item.question}"`}
                        onClick={() => setDeactivatingQuestion(item)}
                      >
                        <Ban className="size-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Activate question "${item.question}"`}
                        onClick={() => void setQuestionActive(item.id, true)}
                      >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RfpQuestionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        question={editingQuestion}
        allQuestions={questions}
      />
      <RfpQuestionHistoryDialog question={historyQuestion} onClose={() => setHistoryQuestion(null)} />

      <AlertDialog
        open={deactivatingQuestion !== null}
        onOpenChange={(open) => !open && setDeactivatingQuestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate RFP Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This question will no longer be available for selection in new RFP processes. It remains in the master for
              historical reference, and RFPs that already use it are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
