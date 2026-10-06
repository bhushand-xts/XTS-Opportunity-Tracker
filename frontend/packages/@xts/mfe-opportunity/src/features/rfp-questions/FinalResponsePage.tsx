import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, Eye, FileCheck2, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  useSetPageTitle,
  type Opportunity,
  type RfpQuestionItem,
  type RfpSection,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { SectionTitle } from "../opportunity-create/SectionTitle";
import {
  useFinalResponseReadiness,
  useGenerateFinalResponse,
  useSendFinalResponseForApproval,
} from "./rfpFinalResponse.mockHooks";
import { useRfpQuestionItems } from "./rfpQuestionItem.mockHooks";
import { useRfpSections } from "./rfpSection.mockHooks";

function answerText(q: RfpQuestionItem): string {
  if (q.answerDocument) return q.answerDocument.fileName;
  if (q.answerValues?.length) return q.answerValues.join(", ");
  return q.answerValue || "—";
}

function buildDocument(
  opportunity: Opportunity,
  questions: RfpQuestionItem[],
  sections: RfpSection[],
  details: { title: string; description: string; exceptions: string }
): string {
  const active = questions.filter((q) => !q.withdrawn).sort((a, b) => a.number - b.number);
  const groups = [
    ...sections.map((s) => ({ name: s.name, rows: active.filter((q) => q.sectionId === s.id) })),
    { name: "Unsectioned", rows: active.filter((q) => !q.sectionId || !sections.some((s) => s.id === q.sectionId)) },
  ].filter((g) => g.rows.length > 0);

  const lines: string[] = [`# ${details.title}`, "", details.description, ""];
  if (details.exceptions.trim()) lines.push("## Exceptions", details.exceptions.trim(), "");

  for (const group of groups) {
    lines.push(`## ${group.name}`, "");
    for (const q of group.rows) {
      lines.push(`### ${q.number}. ${q.questionText}${q.mandatory ? " *" : ""}`);
      lines.push(`**Type:** ${q.type} · **Priority:** ${q.priority}`, "", `**Answer:** ${answerText(q)}`, "");
    }
  }

  return lines.join("\n");
}

export function FinalResponsePage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("Final response");
  const navigate = useNavigate();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const { sections } = useRfpSections(opportunity.id);
  const { ready, blockingIssues } = useFinalResponseReadiness(opportunity.id);
  const [generate] = useGenerateFinalResponse();
  const [sendForApproval] = useSendFinalResponseForApproval();

  const existing = opportunity.finalResponse;
  const [title, setTitle] = useState(existing?.title ?? `${opportunity.name} — Final Response`);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [exceptions, setExceptions] = useState(existing?.exceptions ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string[]>([]);

  const checks = [
    {
      label: "Every mandatory question has an answer",
      failed: blockingIssues.some((i) => i.includes("not yet answered")),
    },
    {
      label: "Every mandatory question's answer is approved",
      failed: blockingIssues.some((i) => i.includes("not yet approved")),
    },
    { label: "No question is unassigned", failed: blockingIssues.some((i) => i.includes("unassigned")) },
    { label: "No question is in rework", failed: blockingIssues.some((i) => i.includes("in rework")) },
  ];

  async function handleGenerate() {
    const result = await generate(opportunity.id, { title, description, exceptions });
    if (!result.ok) {
      setGenerateError(result.blockingIssues);
      return;
    }
    setGenerateError([]);
  }

  function handleDownload() {
    const content = buildDocument(opportunity, questions, sections, { title, description, exceptions });
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${opportunity.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-final-response-v${existing?.version ?? 1}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${opportunity.name} · Final response`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(`/opportunities/${opportunity.id}/questions`)}>
            Back to review
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <SectionTitle icon={FileCheck2}>Response details</SectionTitle>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Exceptions / notes
                  <span className="ml-1 font-normal text-muted-foreground">
                    — documentation only, doesn&apos;t skip the readiness checks below
                  </span>
                </Label>
                <Textarea rows={3} placeholder="Optional" value={exceptions} onChange={(e) => setExceptions(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {previewOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-xs">
                  {buildDocument(opportunity, questions, sections, { title, description, exceptions })}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen((v) => !v)}>
              <Eye className="mr-2 size-4" />
              {previewOpen ? "Hide preview" : "Preview"}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 size-4" />
              Download
            </Button>
            <Button disabled={!ready} onClick={() => void handleGenerate()}>
              {existing ? "Regenerate" : "Generate"}
            </Button>
            <Button
              variant="outline"
              disabled={existing?.status !== "Generated"}
              onClick={() => void sendForApproval(opportunity.id)}
            >
              Send for approval
            </Button>
          </div>
          {generateError.length > 0 && (
            <p className="text-right text-sm text-destructive">Couldn&apos;t generate — resolve the readiness checklist first.</p>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className={`text-sm font-medium ${ready ? "text-emerald-600" : "text-destructive"}`}>
                {ready ? "Ready to generate" : `${blockingIssues.length} issue(s) to resolve`}
              </p>
              <ul className="space-y-2 text-sm">
                {checks.map((check) => (
                  <li key={check.label} className="flex items-start gap-2">
                    {check.failed ? (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    )}
                    <span className={check.failed ? "text-destructive" : "text-muted-foreground"}>{check.label}</span>
                  </li>
                ))}
              </ul>
              {blockingIssues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {blockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {existing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={existing.status === "Sent for approval" ? "success" : "muted"}>{existing.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>{existing.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prepared by</span>
                  <span>{existing.preparedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Generated</span>
                  <span>{new Date(existing.generatedAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
