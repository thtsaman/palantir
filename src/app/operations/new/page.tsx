import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { ReportIngestClient } from "../ReportIngestClient";

export const dynamic = "force-dynamic";

export default function NewOperationPage() {
  return (
    <AppShell
      title="Operations · Ingest Report"
      meta={<StatusBadge tone="muted">AI-ASSISTED</StatusBadge>}
    >
      <PageHeader
        eyebrow="Operational Learning"
        title="Ingest Report"
        description="Paste an after-action or training report to structure conditions, observations, and lessons."
        actions={
          <Button href="/operations" variant="ghost" size="sm">
            ← All Operations
          </Button>
        }
      />
      <ReportIngestClient />
    </AppShell>
  );
}
