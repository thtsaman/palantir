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
      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--ink)]/95 pl-14 pr-4 backdrop-blur-sm sm:px-6">
          <div className="min-w-0 truncate text-[12px] font-medium text-[var(--gray-300)] sm:text-[13px]">
            {title ?? "Mission Readiness Console"}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-[var(--gray-500)] sm:gap-3 sm:text-[11px]">
            {meta}
            <span className="hidden rounded border border-[var(--border)] px-2 py-1 font-mono text-[9px] tracking-wide text-[var(--signal)] sm:inline-flex">SYNTHETIC MODEL</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[var(--content-max)] px-4 py-5 sm:px-6 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
