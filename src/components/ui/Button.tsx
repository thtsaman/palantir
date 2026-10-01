import { cn } from "@/lib/utils";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger-quiet";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--cyan)] text-[var(--ink)] hover:brightness-110 border border-transparent",
  secondary:
    "bg-transparent text-[var(--off-white)] border border-[var(--border-strong)] hover:border-[var(--cyan)]/40 hover:text-[var(--white)]",
  ghost:
    "bg-transparent text-[var(--gray-300)] border border-transparent hover:text-[var(--white)] hover:bg-[var(--gray-800)]",
  "danger-quiet":
    "bg-transparent text-[var(--gray-300)] border border-[var(--border)] hover:text-[var(--white)]",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  size?: "sm" | "md";
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium transition-[filter,background,border-color,color] duration-150 disabled:opacity-40 disabled:pointer-events-none",
    size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
