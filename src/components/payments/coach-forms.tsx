"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import {
  confirmPaymentAction,
  registerPaymentAction,
  rejectPaymentAction,
  saveClientPaymentAction,
  savePaymentSettingsAction,
} from "@/app/coach/pagos/actions";
import { centsToInput, METHOD_LABEL, payButtonLabel, type PaymentMethod } from "@/lib/payments";
import { formatDate } from "@/lib/format";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

type Msg = { text: string; bad?: boolean } | null;
const Status = ({ msg }: { msg: Msg }) => (msg ? <p role="status" className={msg.bad ? "text-sm text-bad" : "text-sm text-ok"}>{msg.text}</p> : null);

// ---------------------------------------------------------------- Configuración general

export function PaymentSettingsForm({ initial }: { initial: { payment_link: string | null; payment_plan_name: string | null; payment_amount_cents: number | null; payment_instructions: string | null } }) {
  const router = useRouter();
  const [link, setLink] = useState(initial.payment_link ?? "");
  const [plan, setPlan] = useState(initial.payment_plan_name ?? "");
  const [amount, setAmount] = useState(centsToInput(initial.payment_amount_cents));
  const [instr, setInstr] = useState(initial.payment_instructions ?? "");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const okLink = /^https:\/\/\S+\.\S+/i.test(link.trim());

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePaymentSettingsAction({ payment_link: link, payment_plan_name: plan, payment_amount_cents: amount, payment_instructions: instr });
          setMsg(res.ok ? { text: "Configuración guardada" } : { text: res.error, bad: true });
          if (res.ok) router.refresh();
        });
      }}
    >
      <Field label="Link de pago (Cubo u otro)" htmlFor="pay_link">
        <Input id="pay_link" type="url" inputMode="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} />
      </Field>
      {okLink && (
        <a href={link.trim()} target="_blank" rel="noreferrer" className="-mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-muted underline hover:text-fg">
          Probar link ({payButtonLabel(link.trim())}) <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del plan" htmlFor="pay_plan">
          <Input id="pay_plan" placeholder="Coaching mensual" value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Monto mensual (US$)" htmlFor="pay_amount">
          <Input id="pay_amount" inputMode="decimal" placeholder="40" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <Field label="Instrucciones para el cliente (opcional)" htmlFor="pay_instr">
        <Textarea id="pay_instr" rows={3} maxLength={1000} value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="Ej.: la suscripción se cobra sola cada mes. Después de pagar, tocá «Ya pagué»." />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</Button>
        <Status msg={msg} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Link / monto por cliente

export function ClientPaymentForm({ clientId, link: l0, amountCents, defaults }: { clientId: string; link: string | null; amountCents: number | null; defaults: { link: string | null; amount_cents: number | null } }) {
  const router = useRouter();
  const [link, setLink] = useState(l0 ?? "");
  const [amount, setAmount] = useState(centsToInput(amountCents));
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveClientPaymentAction(clientId, { payment_link: link, payment_amount_cents: amount });
          setMsg(res.ok ? { text: "Guardado" } : { text: res.error, bad: true });
          if (res.ok) router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Link propio de este cliente" htmlFor="cl_link">
          <Input id="cl_link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={defaults.link ? "Vacío = usa tu link general" : "https://…"} maxLength={500} />
        </Field>
        <Field label="Monto (US$)" htmlFor="cl_amount">
          <Input id="cl_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={defaults.amount_cents != null ? `General: ${centsToInput(defaults.amount_cents)}` : "40"} />
        </Field>
      </div>
      <p className="text-xs text-faint">Dejalo vacío para usar el link y el monto generales de la sección Pagos.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Status msg={msg} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Registrar pago directo

export function RegisterPaymentForm({ clientId, defaultAmountCents }: { clientId: string; defaultAmountCents: number | null }) {
  const router = useRouter();
  const [amount, setAmount] = useState(centsToInput(defaultAmountCents));
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await registerPaymentAction(clientId, { amount_cents: amount, months, method, reference: ref });
          if (!res.ok) return setMsg({ text: res.error, bad: true });
          setMsg({ text: `Pago registrado. Renovación: ${formatDate(res.renewal!)}` });
          setRef("");
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Monto (US$)" htmlFor="rp_amount">
          <Input id="rp_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="40" />
        </Field>
        <Field label="Meses" htmlFor="rp_months">
          <Select id="rp_months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
          </Select>
        </Field>
        <Field label="Forma de pago" htmlFor="rp_method">
          <Select id="rp_method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </Select>
        </Field>
        <Field label="Referencia (opcional)" htmlFor="rp_ref">
          <Input id="rp_ref" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} placeholder="N.º de recibo" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Registrando…" : "Registrar pago"}</Button>
        <Status msg={msg} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Confirmar / rechazar un aviso del cliente

export function PendingPaymentActions({ paymentId, clientId }: { paymentId: string; clientId: string }) {
  const router = useRouter();
  const [months, setMonths] = useState(1);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Motivo (lo ve el cliente)" htmlFor={`rj_${paymentId}`}>
          <Input id={`rj_${paymentId}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="No encontré el pago en Cubo" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await rejectPaymentAction(paymentId, note, clientId);
                if (!res.ok) return setMsg({ text: res.error, bad: true });
                router.refresh();
              })
            }
          >
            <X size={15} /> Confirmar rechazo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>Volver</Button>
        </div>
        <Status msg={msg} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`m_${paymentId}`} className="sr-only">Meses que cubre</label>
        <Select id={`m_${paymentId}`} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="h-9 w-auto">
          {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await confirmPaymentAction(paymentId, months, clientId);
              if (!res.ok) return setMsg({ text: res.error, bad: true });
              setMsg({ text: `Confirmado. Renovación: ${formatDate(res.renewal!)}` });
              router.refresh();
            })
          }
        >
          <Check size={15} /> {pending ? "Confirmando…" : "Confirmar pago"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(true)}>No lo encuentro</Button>
      </div>
      <Status msg={msg} />
    </div>
  );
}
