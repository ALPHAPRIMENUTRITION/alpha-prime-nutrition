"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/coach/clientes/actions";
import { Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { InviteLinkCard } from "@/components/coach/invite-link-card";
import { ShareLink } from "@/components/intake/share-link";
import { SERVICE_OPTIONS, type ServiceKey } from "@/lib/services";

export interface ClientFormDefaults {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  birth_date?: string | null;
  sex?: string | null;
  height_cm?: number | null;
  goal?: string | null;
  start_date?: string;
  renewal_date?: string | null;
  service?: ServiceKey;
  /** Peso inicial sugerido (lb), p. ej. desde el cuestionario */
  weight_lb?: string;
}

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function ClientForm({
  mode,
  action,
  defaults,
  emailLocked = false,
  invitesEnabled,
  cancelHref,
  hidden,
}: {
  mode: "new" | "edit";
  action: Action;
  defaults: ClientFormDefaults;
  emailLocked?: boolean;
  invitesEnabled: boolean;
  cancelHref: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const f = state.fields ?? {};
  // Si hubo error, se reponen los valores enviados (React reinicia el formulario tras la acción)
  const v: ClientFormDefaults = state.values ? { ...defaults, ...state.values, height_cm: state.values.height_cm ? Number(state.values.height_cm) : null } : defaults;

  if (mode === "new" && state.ok && state.clientId) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-card border border-line bg-panel p-6">
          <p className="eyebrow">Cliente creado</p>
          <p className="mt-1 font-display text-3xl font-extrabold uppercase">Listo</p>
          <p className="mt-2 text-sm text-muted">
            {state.invite
              ? "El expediente ya está en tu panel."
              : "Todavía no le llegó nada al cliente. Armale su plan y su rutina, y cuando esté todo listo invitalo desde su perfil con «Invitar por WhatsApp»."}
          </p>
        </div>
        {state.invite && <InviteLinkCard invite={state.invite} firstName={state.firstName || "tu cliente"} phone={state.phone} />}
        {state.intakeUrl && (
          <div className="flex flex-col gap-3 rounded-card border border-line bg-panel p-5">
            <p className="eyebrow">Cuestionario completo</p>
            <p className="text-sm text-muted">Cuando haya pagado, mandale este link: salud, alimentación, entreno y estilo de vida. Sus respuestas quedan en su perfil.</p>
            <ShareLink
              url={state.intakeUrl}
              phone={state.phone}
              waText={`¡Hola ${state.firstName || ""}! Bienvenido a Alpha Prime 💪 Para armar tu plan a tu medida, llená este cuestionario (te toma unos 5 minutos):`}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/coach/clientes/${state.clientId}${state.invite ? "" : "?tab=nutricion"}`} className={buttonClass("primary")}>
            {state.invite ? "Ver perfil" : "Armar su plan"}
          </Link>
          <a href="/coach/clientes/nuevo" className={buttonClass("secondary")}>
            Agregar otro
          </a>
        </div>
      </div>
    );
  }

  return (
    <form key={state.savedAt ?? "init"} action={formAction} className="flex flex-col gap-6" noValidate>
      {Object.entries(hidden ?? {}).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      {state.error && (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          {state.error}
        </p>
      )}

      <fieldset className="grid gap-4 rounded-card border border-line bg-panel p-5 sm:grid-cols-2">
        <legend className="eyebrow px-1">Datos personales</legend>
        <Field label="Nombre *" htmlFor="first_name" error={f.first_name}>
          <Input id="first_name" name="first_name" defaultValue={v.first_name} required autoComplete="off" />
        </Field>
        <Field label="Apellido *" htmlFor="last_name" error={f.last_name}>
          <Input id="last_name" name="last_name" defaultValue={v.last_name} required autoComplete="off" />
        </Field>
        <Field label={emailLocked ? "Correo (vinculado a su cuenta)" : "Correo *"} htmlFor="email" error={f.email}>
          <Input id="email" name="email" type="email" inputMode="email" defaultValue={v.email} readOnly={emailLocked} required className={emailLocked ? "opacity-60" : undefined} />
        </Field>
        <Field label="Teléfono / WhatsApp" htmlFor="phone" error={f.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="7000 0000" defaultValue={v.phone ?? ""} />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date" error={f.birth_date}>
          <Input id="birth_date" name="birth_date" type="date" defaultValue={v.birth_date ?? ""} />
        </Field>
        <Field label="Sexo" htmlFor="sex" error={f.sex}>
          <Select id="sex" name="sex" defaultValue={v.sex ?? ""} className="w-full">
            <option value="">Sin especificar</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </Select>
        </Field>
        <Field label="Altura (cm)" htmlFor="height_cm" error={f.height_cm}>
          <Input id="height_cm" name="height_cm" type="number" inputMode="decimal" step="0.1" placeholder="175" defaultValue={v.height_cm ?? ""} />
        </Field>
        {mode === "new" && (
          <Field label="Peso inicial (lb)" htmlFor="weight_kg" error={f.weight_kg}>
            <Input id="weight_kg" name="weight_kg" type="number" inputMode="decimal" step="0.1" placeholder="180" defaultValue={state.values?.weight_kg ?? defaults.weight_lb ?? ""} />
          </Field>
        )}
      </fieldset>

      <fieldset className="grid gap-4 rounded-card border border-line bg-panel p-5 sm:grid-cols-2">
        <legend className="eyebrow px-1">Programa y membresía</legend>
        <div className="sm:col-span-2">
          <Field label="Servicio contratado *" htmlFor="service" error={f.service}>
            <Select id="service" name="service" defaultValue={v.service ?? "both"} className="w-full">
              {SERVICE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </Field>
          <p className="mt-1.5 text-xs text-faint">El cliente solo ve en su app lo que tiene contratado. Vos siempre podés preparar ambos planes.</p>
        </div>
        <div className="sm:col-span-2">
          <Field label="Objetivo" htmlFor="goal" error={f.goal}>
            <Input id="goal" name="goal" placeholder="Ej. pérdida de grasa, ganancia muscular" defaultValue={v.goal ?? ""} />
          </Field>
        </div>
        <Field label="Fecha de inicio *" htmlFor="start_date" error={f.start_date}>
          <Input id="start_date" name="start_date" type="date" defaultValue={v.start_date} required />
        </Field>
        <Field label="Fecha de renovación" htmlFor="renewal_date" error={f.renewal_date}>
          <Input id="renewal_date" name="renewal_date" type="date" defaultValue={v.renewal_date ?? ""} />
        </Field>
      </fieldset>

      {mode === "new" && (
        <fieldset className="flex flex-col gap-4 rounded-card border border-line bg-panel p-5">
          <legend className="eyebrow px-1">Notas y acceso</legend>
          <Field label="Notas privadas (solo vos las ves)" htmlFor="note" error={f.note}>
            <Textarea id="note" name="note" placeholder="Lesiones, preferencias, horarios…" defaultValue={state.values?.note ?? ""} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="create_account" defaultChecked={false} disabled={!invitesEnabled} className="mt-0.5 h-5 w-5 accent-[#e3242f]" />
            <span>
              <span className="font-semibold">Invitarlo a la app ahora</span>
              <span className="block text-muted">
                {invitesEnabled
                  ? "Dejalo sin marcar si primero querés armarle el plan y la rutina. Lo invitás después desde su perfil con «Invitar por WhatsApp»."
                  : "Disponible cuando se configure la clave SUPABASE_SERVICE_ROLE_KEY en Netlify."}
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending} className="uppercase tracking-[0.1em]">
          {pending ? "Guardando…" : mode === "new" ? "Crear cliente" : "Guardar cambios"}
        </Button>
        <Link href={cancelHref} className={buttonClass("ghost", "lg")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
