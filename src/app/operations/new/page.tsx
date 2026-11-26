import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { ReportIngestClient } from "../ReportIngestClient";
import { DocumentIngestClient } from "../DocumentIngestClient";

export const dynamic = "force-dynamic";

export default async function NewOperationPage({ searchParams }: { searchParams: Promise<{ sourceDocumentId?: string }> }) {
  const { sourceDocumentId } = await searchParams;
  return (
    <AppShell
      title="Operations · Ingest Report"
      meta={<StatusBadge tone="muted">SOURCE INGEST</StatusBadge>}
    >
      <PageHeader
        eyebrow="Operational Learning"
        title="Ingest Report"
        description="Upload and review a document source, or continue using the existing pasted-text workflow."
        actions={
          <Button href="/operations" variant="ghost" size="sm">
            ← All Operations
          </Button>
        }
      />
      <div className="space-y-5">
        <DocumentIngestClient initialSourceId={sourceDocumentId ?? null} />
        <ReportIngestClient />
      </div>
    </AppShell>
  );
}
