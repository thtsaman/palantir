import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="label-xs mb-2.5 text-[var(--cyan)]">{eyebrow}</div> : null}
        <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[var(--white)] leading-[1.08] sm:text-[34px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-[var(--gray-300)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--white)]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--gray-500)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cn("panel", padded && "p-4", className)}>{children}</div>
  );
}

export function StatValue({
  label,
  value,
  size = "md",
  hint,
  className,
}: {
  label: string;
  value: string | number;
  size?: "sm" | "md" | "lg" | "xl";
  hint?: string;
  className?: string;
}) {
  const sizes = {
    sm: "text-[18px]",
    md: "text-[28px]",
    lg: "text-[40px]",
    xl: "text-[52px]",
  };
  return (
    <div className={className}>
      <div className="label-xs mb-1">{label}</div>
      <div
        className={cn(
          "mono tabular font-medium text-[var(--white)] leading-none",
          sizes[size]
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-[var(--gray-500)]">{hint}</div>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "cyan" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold tracking-[0.1em] uppercase",
        tone === "cyan" &&
          "border-[var(--cyan)]/25 bg-[var(--cyan-dim)] text-[var(--cyan)]",
        tone === "neutral" &&
          "border-[var(--border)] bg-white/[0.035] text-[var(--gray-100)]",
        tone === "muted" &&
          "border-[var(--border)] text-[var(--gray-500)]"
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex min-h-44 flex-col items-start justify-center gap-2.5 p-6 sm:p-8">
      <div className="label-xs text-[var(--gray-300)]">Nothing here yet</div>
      <h3 className="text-[17px] font-semibold tracking-tight text-[var(--white)]">{title}</h3>
      <p className="max-w-md text-[13px] leading-relaxed text-[var(--gray-300)]">{description}</p>
      {action}
    </div>
  );
}
