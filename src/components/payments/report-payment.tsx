"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { reportPaymentAction } from "@/app/portal/membresia/actions";
import { centsToInput } from "@/lib/payments";
import { Button, Field, Input } from "@/components/ui";

/** "Ya pagué": avisa al coach para que confirme. */
export function ReportPayment({ amountCents }: { amountCents: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(centsToInput(amountCents));
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <CheckCircle2 size={18} /> Ya pagué
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await reportPaymentAction({ amount_cents: amount, reference: ref });
          if (!res.ok) return setErr(res.error);
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-muted">Avisale a tu coach que ya pagaste. Él lo confirma y tu membresía se renueva.</p>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Field label="Monto (US$)" htmlFor="rep_amount">
          <Input id="rep_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="40" />
        </Field>
        <Field label="N.º de comprobante (opcional)" htmlFor="rep_ref">
          <Input id="rep_ref" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} placeholder="Del correo de confirmación" />
        </Field>
      </div>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">{pending ? "Enviando…" : "Avisar a mi coach"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
