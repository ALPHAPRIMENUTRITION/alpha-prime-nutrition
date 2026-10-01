"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Diálogo modal nativo (<dialog>): foco atrapado y Escape para cerrar. Hoja inferior en móvil. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-graphite p-0 text-fg backdrop:bg-black/70",
        "sm:m-auto sm:rounded-2xl",
        wide ? "sm:max-w-3xl" : "sm:max-w-lg",
      )}
    >
      {open && (
        <div className="flex flex-col gap-5 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg">
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
