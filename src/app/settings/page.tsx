import { AppShell } from "@/components/layout/AppShell";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { isAiConfigured } from "@/lib/ai/analyze-operation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.APP_NAME ||
    "Human Performance Simulation";
  const nodeEnv = process.env.NODE_ENV || "development";

  let dbConnected = false;
  let dbNote = "Connection check failed";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    dbNote = "Query probe succeeded";
  } catch {
    dbConnected = false;
    dbNote = "Unable to reach database — check DATABASE_URL";
  }

  const aiConfigured = isAiConfigured();

  const envNames = [
    "DATABASE_URL",
    "AI_API_KEY",
    "AI_BASE_URL",
    "AI_MODEL",
    "NEXT_PUBLIC_ENABLE_AI",
    "NEXT_PUBLIC_APP_NAME",
    "APP_NAME",
    "NODE_ENV",
  ];

  return (
    <AppShell
      title="Settings · System"
      meta={<StatusBadge tone="muted">CONFIGURATION</StatusBadge>}
    >
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Environment status for the simulation console. Secrets are never displayed."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="!p-5 space-y-5">
          <SectionHeader
            title="Application"
            subtitle="Runtime identity"
          />
          <Row label="Name" value={appName} />
          <Row label="Environment" value={nodeEnv.toUpperCase()} mono />
          <Row
            label="Build"
            value="Prototype simulation console"
          />
        </Panel>

        <Panel className="!p-5 space-y-5">
          <SectionHeader
            title="Services"
            subtitle="Connectivity and readiness"
          />
          <StatusRow
            label="Database"
            status={dbConnected ? "CONNECTED" : "UNREACHABLE"}
            tone={dbConnected ? "cyan" : "muted"}
            note={dbNote}
          />
          <StatusRow
            label="Simulation Engine"
            status="READY"
            tone="cyan"
            note="Deterministic TypeScript engine loaded"
          />
          <StatusRow
            label="AI Provider"
            status={aiConfigured ? "CONFIGURED" : "DEMO MODE"}
            tone={aiConfigured ? "cyan" : "muted"}
            note={
              aiConfigured
                ? "AI_API_KEY present — live analysis available"
                : "No AI_API_KEY — report analysis uses deterministic fallback"
            }
          />
        </Panel>
      </div>

      <Panel className="mt-4 !p-5">
        <SectionHeader
          title="Environment Variables"
          subtitle="Names only — values are never shown"
          action={<StatusBadge tone="muted">SAFE LIST</StatusBadge>}
        />
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {envNames.map((name) => {
            const present = Boolean(process.env[name]?.trim());
            return (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border)] px-3 py-2"
              >
                <span className="mono text-[12px] text-[var(--off-white)]">
                  {name}
                </span>
                <StatusBadge tone={present ? "cyan" : "muted"}>
                  {present ? "SET" : "UNSET"}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] text-[var(--gray-500)]">
          API keys and connection strings are never rendered in this UI.
        </p>
      </Panel>
    </AppShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <span className="text-[12px] uppercase tracking-wide text-[var(--gray-500)]">
        {label}
      </span>
      <span
        className={
          mono
            ? "mono text-right text-[13px] text-[var(--white)]"
            : "text-right text-[13px] text-[var(--white)]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function StatusRow({
  label,
  status,
  tone,
  note,
}: {
  label: string;
  status: string;
  tone: "cyan" | "muted";
  note: string;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-[var(--off-white)]">{label}</span>
        <StatusBadge tone={tone}>{status}</StatusBadge>
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--gray-500)]">{note}</p>
    </div>
  );
}
