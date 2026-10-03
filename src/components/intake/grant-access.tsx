"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BadgeCheck, CheckCircle2, MessageCircle, UserRound } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { WaLink } from "@/components/whatsapp/wa-link";
import type { ConvertResult } from "@/app/coach/solicitudes/actions";
import { cn } from "@/lib/cn";

const field = "h-11 w-full rounded-xl border border-line bg-ink px-3 text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none";

/** "Ya pagó": crea el cliente, registra el pago y deja listo el mensaje con el link de la app. */
export function GrantAccess({
  action,
  firstName,
  defaultEmail,
}: {
  action: (input: { email: string; amount: string; months: string; method: string }) => Promise<ConvertResult>;
  firstName: string;
  defaultEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ email: defaultEmail ?? "", amount: "", months: "1", method: "link" });
  const [res, setRes] = useState<ConvertResult | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  if (res?.ok) {
    const msg = res.link
      ? `¡Bienvenido/a a Alpha Prime, ${res.firstName}! 💪\n\n1️⃣ Entrá a este link para crear tu contraseña y activar tu app:\n${res.link}\n\n2️⃣ Al entrar te va a aparecer el cuestionario inicial. Llenalo (te toma unos 5 minutos) y con eso armo tu plan.\n\n⏱️ El link vence en 1 hora. Cualquier duda me escribís.`
      : "";
    return (
      <div className="flex w-full flex-col gap-3 rounded-card border border-ok/40 bg-ok/10 p-4">
        <p className="flex items-center gap-2 font-semibold text-ok">
          <CheckCircle2 size={18} /> {res.firstName} ya es cliente{res.renewal ? `. Pago registrado, renueva el ${new Date(res.renewal + "T00:00:00").toLocaleDateString("es-SV", { day: "numeric", month: "long" })}` : ""}.
        </p>
        {res.link ? (
          <>
            <p className="whitespace-pre-wrap rounded-xl border border-line bg-ink p-3 text-sm [overflow-wrap:anywhere]">{msg}</p>
            <div className="flex flex-wrap gap-2">
              <WaLink phone={res.phone} text={msg} className={buttonClass("primary", "sm")}>
                <MessageCircle size={16} /> Enviar por WhatsApp
              </WaLink>
              <Link href={`/coach/clientes/${res.clientId}`} className={buttonClass("secondary", "sm")}>
                <UserRound size={16} /> Ver su perfil
              </Link>
            </div>
            <p className="text-xs text-muted">Si el link se le vence, en su perfil tocá «Reenviar invitación».</p>
          </>
        ) : (
          <p className="text-sm text-bad">No se pudo generar el link de la app: {res.inviteError}. Generalo desde su perfil con «Invitar por WhatsApp».</p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary", "sm")}>
        <BadgeCheck size={16} /> Ya pagó: darle acceso
      </button>
    );
  }

  const err = res && !res.ok ? res : null;
  return (
    <form
      className="flex w-full flex-col gap-3 rounded-card border border-red/40 bg-panel p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setRes(await action(v)));
      }}
    >
      <p className="font-semibold">Darle acceso a {firstName}</p>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Correo (para su cuenta) *
        <input type="email" inputMode="email" required value={v.email} onChange={set("email")} placeholder="correo@gmail.com" className={cn(field, err?.field === "email" && "border-bad")} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Pagó ($)
          <input inputMode="decimal" value={v.amount} onChange={set("amount")} placeholder="Opcional" className={cn(field, err?.field === "amount" && "border-bad")} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Meses
          <select value={v.months} onChange={set("months")} className={field}>
            {["1", "2", "3", "6", "12"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Forma
          <select value={v.method} onChange={set("method")} className={field}>
            <option value="link">Link de pago</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-faint">Se crea el cliente con sus datos, se registra el pago y te queda listo el mensaje con el link de la app.</p>
      {err && <p role="alert" className="text-sm text-bad">{err.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {pending ? "Creando…" : "Crear y generar link"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
