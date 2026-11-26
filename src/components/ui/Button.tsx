import { cn } from "@/lib/utils";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger-quiet";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--signal)] text-[#17130d] hover:brightness-105 border border-transparent shadow-sm shadow-black/20",
  secondary:
    "bg-[var(--ink-raised)] text-[var(--off-white)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--white)]",
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
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[filter,background,border-color,color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)] disabled:opacity-40 disabled:pointer-events-none",
    size === "sm" ? "min-h-9 px-3 text-[12px]" : "min-h-10 px-4 text-[13px]",
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
