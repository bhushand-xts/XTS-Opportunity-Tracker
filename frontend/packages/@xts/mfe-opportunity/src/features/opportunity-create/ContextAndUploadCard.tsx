import { Upload } from "lucide-react";
import { Card, CardContent, CardTitle, type UploadedDocument } from "@xts/design-system";
import { DocumentUpload } from "./DocumentUpload";
import { RfpContextDrawerSection } from "./RfpContextCard";
import { SectionTitle } from "./SectionTitle";

// Horizontal view's 4th card: RFP context (as a Drawer trigger — see
// RfpContextDrawerSection) and Upload document share one card so the row
// stays a clean 4 equal columns alongside Solicitation/Key dates/Submission,
// instead of spilling onto a second row.
export function ContextAndUploadCard({
  document,
  onChange,
  acceptedExtensions,
  maxSizeMB,
}: {
  document: UploadedDocument | null;
  onChange: (doc: UploadedDocument) => void;
  acceptedExtensions?: string[];
  maxSizeMB?: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col space-y-3 p-3">
        <RfpContextDrawerSection />
        <div className="flex flex-1 flex-col space-y-1.5 border-t pt-3">
          <CardTitle className="text-sm">
            <SectionTitle icon={Upload}>Upload document</SectionTitle>
          </CardTitle>
          <div className="flex-1">
            <DocumentUpload
              document={document}
              onChange={onChange}
              compact
              acceptedExtensions={acceptedExtensions}
              maxSizeMB={maxSizeMB}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
