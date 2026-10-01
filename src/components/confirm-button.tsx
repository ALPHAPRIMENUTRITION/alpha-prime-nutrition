"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";

/** Acción destructiva o importante con confirmación en la misma página. */
export function ConfirmButton({
  action,
  label,
  confirmText,
  confirmLabel = "Sí, confirmar",
  tone = "danger",
  size = "sm",
  className,
}: {
  action: () => Promise<void>;
  label: React.ReactNode;
  confirmText: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
  size?: "xs" | "sm";
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const sz = size === "xs" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm";

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors", sz,
          tone === "danger" ? "text-bad hover:bg-bad/10" : "bg-panel-2 text-fg hover:bg-line", className)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2" role="alertdialog" aria-label={confirmText}>
      <span className="text-sm text-muted">{confirmText}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await action(); setAsking(false); })}
        className={cn("rounded-full font-semibold text-white", sz, tone === "danger" ? "bg-bad/90 hover:bg-bad" : "bg-red hover:bg-red-hover")}
      >
        {pending ? "…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={cn("rounded-full text-muted hover:text-fg", sz)}>
        Cancelar
      </button>
    </span>
  );
}
