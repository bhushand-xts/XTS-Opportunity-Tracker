import { useRef, useState } from "react";
import { RotateCw, UploadCloud } from "lucide-react";
import { Badge, Button, cn, type UploadedDocument } from "@xts/design-system";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// No real upload backend exists (see the plan's backend-gaps notes) — this is
// a genuinely working dropzone (native drag-and-drop + file picker), but it
// only ever captures File.name/.size into UploadedDocument, never the file's
// actual bytes. Nothing else in the app has a file-upload pattern yet.
export function DocumentUpload({
  document,
  onChange,
  compact,
}: {
  document: UploadedDocument | null;
  onChange: (doc: UploadedDocument) => void;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onChange({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      uploadedAt: new Date().toISOString(),
      status: "Ready",
    });
  }

  return (
    <div className={compact ? "h-full" : undefined}>
      {!document ? (
        <div
          className={cn(
            "rounded-lg border-2 border-dashed text-center transition-colors",
            compact ? "flex h-full flex-col items-center justify-center p-3" : "p-10",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div
            className={cn(
              "mx-auto grid place-items-center rounded-xl bg-primary/10",
              compact ? "mb-1.5 size-8" : "mb-3.5 size-12"
            )}
          >
            <UploadCloud className={compact ? "size-4 text-primary" : "size-6 text-primary"} />
          </div>
          <h3 className={compact ? "text-xs font-semibold" : "text-[15px] font-semibold"}>Drop the RFP here, or browse</h3>
          <p className={compact ? "mx-auto mt-1 max-w-[220px] text-[11px] text-muted-foreground" : "mx-auto mt-1 max-w-sm text-[12.5px] text-muted-foreground"}>
            PDF, DOCX or ZIP up to 50 MB. The system reads the document and pulls out each question.
          </p>
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className={compact ? "mt-2 h-7 text-xs" : "mt-3.5"}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.zip"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border p-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-[11px] font-bold text-amber-700">
            {document.fileName.split(".").pop()?.toUpperCase().slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{document.fileName}</p>
            <p className="text-xs text-muted-foreground">{document.fileSizeLabel} · uploaded just now</p>
          </div>
          <Badge variant="success">Ready</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Replace file"
            onClick={() => inputRef.current?.click()}
          >
            <RotateCw className="size-4" />
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}
    </div>
  );
}
