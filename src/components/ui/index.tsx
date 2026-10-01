import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/membership";

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-red text-white hover:bg-red-hover",
  secondary: "bg-panel-2 text-fg hover:bg-line",
  ghost: "text-muted hover:text-fg hover:bg-panel-2",
};
const buttonSizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base" };

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof buttonSizes = "md", extra?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-panel", className)} {...props} />;
}

const toneClass: Record<Tone, string> = {
  ok: "bg-ok/12 text-ok",
  warn: "bg-warn/12 text-warn",
  bad: "bg-bad/12 text-bad",
  neutral: "bg-panel-2 text-muted",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", toneClass[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-graphite px-3.5 text-[15px] text-fg placeholder:text-faint",
        "focus:border-red focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-line bg-graphite px-3.5 py-2.5 text-[15px] text-fg placeholder:text-faint",
        "focus:border-red focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 rounded-xl border border-line bg-graphite px-3 text-sm text-fg focus:border-red focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-panel-2 font-display text-sm font-bold tracking-wide text-fg ring-1 ring-line"
      style={{ width: size, height: size }}
    >
      {letters || "?"}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-display text-xl font-bold uppercase tracking-wide">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-panel-2", className)} />;
}
