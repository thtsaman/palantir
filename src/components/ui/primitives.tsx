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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="label-xs mb-2">{eyebrow}</div> : null}
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--white)] leading-none">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] text-[var(--gray-300)]">
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
        <h2 className="text-[15px] font-semibold text-[var(--white)]">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-[var(--gray-500)]">{subtitle}</p>
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
          "mono tabular font-medium text-[var(--cyan)] leading-none",
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
        "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        tone === "cyan" &&
          "border-[var(--cyan)]/30 bg-[var(--cyan-dim)] text-[var(--cyan)]",
        tone === "neutral" &&
          "border-[var(--border-strong)] bg-[var(--gray-800)] text-[var(--gray-100)]",
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
    <div className="panel flex flex-col items-start gap-3 p-8">
      <div className="label-xs">Empty</div>
      <h3 className="text-[18px] font-semibold text-[var(--white)]">{title}</h3>
      <p className="max-w-md text-[13px] text-[var(--gray-300)]">{description}</p>
      {action}
    </div>
  );
}
