import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/primitives";
import { WhatIfClient } from "./WhatIfClient";

export const dynamic = "force-dynamic";

export default function WhatIfPage() {
  return (
    <AppShell
      title="What-If · Comparison"
      meta={<StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>}
    >
      <WhatIfClient />
    </AppShell>
  );
}
