import { useMemo, useState } from "react";
import { Ban, CheckCircle2, History, Lock, Pencil, Plus, Search } from "lucide-react";
import type { RfpQuestion } from "@xts/api-contracts";
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
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { RfpQuestionFormDialog } from "./RfpQuestionFormDialog";
import { RfpQuestionHistoryDialog } from "./RfpQuestionHistoryDialog";
import { useRfpQuestionMutations } from "./useRfpQuestionMutations";
import { useRfpQuestions } from "./useRfpQuestions";

const COLUMNS = 5;
const MENU_KEY = "generic_rfp_question_master";

export function RfpQuestionMasterPage() {
  useSetPageTitle("Generic RFP Question Master");
  const { questions, loading, error } = useRfpQuestions();
  const { setQuestionActive } = useRfpQuestionMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<RfpQuestion | null>(null);
  const [historyQuestion, setHistoryQuestion] = useState<RfpQuestion | null>(null);
  const [search, setSearch] = useState("");

  const visibleQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => item.question.toLowerCase().includes(q));
  }, [questions, search]);

  const openAdd = () => {
    setEditingQuestion(null);
    setDialogOpen(true);
  };
  const openEdit = (question: RfpQuestion) => {
    setEditingQuestion(question);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Manage the standard questions used during the RFP process."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question"
                aria-label="Search RFP questions"
                className="pl-9"
              />
            </div>
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load RFP questions" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Generic RFP Question Master.</EmptyDescription>
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
                  <TableHead>Question</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Display order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && questions.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No RFP questions yet. Add the first one." />
                )}
                {!loading && questions.length > 0 && visibleQuestions.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No RFP questions match your search." />
                )}
                {visibleQuestions.map((item) => (
                  <TableRow key={item.id} className={item.isActive ? undefined : "text-muted-foreground"}>
                    <TableCell className="max-w-md font-medium">{item.question}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{item.description ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.displayOrder ?? "—"}</TableCell>
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
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit question "${item.question}"`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${item.isActive ? "Deactivate" : "Activate"} question "${item.question}"`}
                          onClick={() => void setQuestionActive(item.id, !item.isActive)}
                        >
                          {item.isActive ? (
                            <Ban className="size-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          )}
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

      <RfpQuestionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        question={editingQuestion}
        allQuestions={questions}
      />
      <RfpQuestionHistoryDialog question={historyQuestion} onClose={() => setHistoryQuestion(null)} />
    </div>
  );
}
