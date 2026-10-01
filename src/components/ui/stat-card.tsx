import Link from "next/link";
import { cn } from "@/lib/cn";

type Tone = "default" | "warn" | "bad" | "ok";
const valueTone: Record<Tone, string> = {
  default: "text-fg",
  warn: "text-warn",
  bad: "text-bad",
  ok: "text-ok",
};

/** Métrica del dashboard. Si tiene href, lleva a la tabla ya filtrada. */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <span className="eyebrow">{label}</span>
      <span className={cn("tnum font-display text-4xl font-extrabold leading-none", valueTone[tone])}>{value}</span>
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </>
  );
  const cls = "flex min-w-0 flex-col gap-2 rounded-card border border-line bg-panel p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-red/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
