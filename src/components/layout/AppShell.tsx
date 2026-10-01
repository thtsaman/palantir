import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  title,
  meta,
}: {
  children: React.ReactNode;
  title?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <Sidebar />
      <div className="pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--border)] bg-[var(--ink)]/95 px-6 backdrop-blur-sm">
          <div className="text-[12px] text-[var(--gray-500)]">
            {title ?? "Mission Readiness Console"}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--gray-500)]">
            {meta}
            <span className="mono text-[var(--cyan)]/80">PROTOTYPE SIMULATION</span>
          </div>
        </header>
        <main className="px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
