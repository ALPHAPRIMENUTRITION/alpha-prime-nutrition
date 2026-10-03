"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, MessageCircle, Pencil } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Mensajes rápidos ya personalizados para una solicitud. */
export function QuickReplies({ intakeId, messages }: { intakeId: string; messages: { idx: number; title: string; text: string }[] }) {
  const [open, setOpen] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const cur = messages[open];
  const copy = async (i: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copiá el mensaje:", text);
    }
  };

  return (
    <section className="rounded-card border border-line bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase">Mensajes rápidos</h2>
        <Link href="/coach/mensajes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Pencil size={14} /> Editar
        </Link>
      </div>
      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {messages.map((m, i) => (
          <button
            key={m.title + i}
            type="button"
            onClick={() => setOpen(i)}
            className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold", open === i ? "border-red bg-red/15 text-fg" : "border-line text-muted hover:text-fg")}
          >
            {m.title}
          </button>
        ))}
      </div>
      {cur && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-ink p-4 text-sm leading-relaxed">{cur.text}</p>
          {/\[[A-ZÁÉÍÓÚÑ ]+\]/.test(cur.text) && (
            <p className="text-xs text-warn">Este mensaje tiene partes entre [CORCHETES] para completar. Podés dejarlas fijas en «Editar».</p>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={`/coach/solicitudes/${intakeId}/whatsapp?m=${cur.idx}`} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
              <MessageCircle size={16} /> Enviar por WhatsApp
            </a>
            <button type="button" onClick={() => copy(open, cur.text)} className={buttonClass("secondary", "sm")}>
              {copied === open ? <Check size={16} /> : <Copy size={16} />} {copied === open ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
