"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { reviewCheckinAction } from "@/app/coach/checkins/actions";
import { Button, Field, Input, Textarea } from "@/components/ui";

/** Devolución del coach: comentario + adherencia revisada. Al guardar queda "Revisado" y se avisa al cliente. */
export function ReviewForm({ checkinId, initialFeedback, adherence, override, reviewed }: { checkinId: string; initialFeedback: string | null; adherence: number | null; override: number | null; reviewed: boolean }) {
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [adh, setAdh] = useState(override != null ? String(override) : "");
  const [open, setOpen] = useState(!reviewed);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-sm font-semibold text-muted underline hover:text-fg">
        Editar devolución
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <Field label="Tu devolución para el cliente" htmlFor={`fb_${checkinId}`}>
        <Textarea id={`fb_${checkinId}`} rows={3} maxLength={3000} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Qué salió bien, qué ajustar esta semana…" />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={`Adherencia revisada (calculada: ${adherence ?? "–"} %)`} htmlFor={`adh_${checkinId}`}>
          <Input id={`adh_${checkinId}`} inputMode="numeric" value={adh} onChange={(e) => setAdh(e.target.value)} placeholder="Opcional" className="w-28" />
        </Field>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const n = adh.trim() === "" ? null : Number(adh);
              if (n != null && (!Number.isInteger(n) || n < 0 || n > 100)) return setMsg({ text: "Adherencia: un número entero de 0 a 100.", bad: true });
              const res = await reviewCheckinAction(checkinId, { feedback, override: n });
              if (!res.ok) return setMsg({ text: res.error, bad: true });
              setMsg({ text: reviewed ? "Devolución actualizada" : "Revisado: el cliente ya recibió tu devolución" });
            })
          }
        >
          <Check size={16} /> {pending ? "Guardando…" : reviewed ? "Guardar devolución" : "Marcar como revisado"}
        </Button>
      </div>
      {msg && <p role="status" className={msg.bad ? "text-sm text-bad" : "text-sm text-ok"}>{msg.text}</p>}
    </div>
  );
}
