"use server";

import { createClient } from "@/lib/supabase/server";
import { parseIntake, SERVICE_VALUE, SEX_VALUE, type IntakeAnswers } from "@/lib/intake";
import { lbToKg } from "@/lib/units";

export type IntakeState = {
  ok?: boolean;
  firstName?: string;
  errors?: Record<string, string>;
  error?: string;
  answers?: IntakeAnswers;
  savedAt?: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guarda el cuestionario. Público: sin sesión. Con token queda en el expediente del cliente. */
export async function submitIntakeAction(token: string | null, _prev: IntakeState, fd: FormData): Promise<IntakeState> {
  // Campo trampa para robots: una persona nunca lo ve ni lo llena
  if (String(fd.get("website") ?? "")) return { ok: true, firstName: "" };
  if (token && !UUID.test(token)) return { error: "Este link no es válido." };

  const parsed = parseIntake(fd, token ? "full" : "short");
  const errors = parsed.ok ? {} : { ...parsed.errors };
  if (!fd.get("consent")) errors.consent = "Necesitamos tu autorización para usar estos datos.";
  if (Object.keys(errors).length) {
    return { errors, answers: parsed.answers, error: "Revisá los campos marcados en rojo.", savedAt: Date.now() };
  }

  const a = parsed.answers;
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  const p = {
    first_name: s("first_name"),
    last_name: s("last_name"),
    email: s("email"),
    phone: s("phone"),
    birth_date: s("birth_date"),
    sex: SEX_VALUE[s("sex")] ?? "",
    height_cm: s("height_cm"),
    weight_kg: s("weight_lb") ? String(lbToKg(Number(s("weight_lb")))) : "",
    goal: s("goal"),
    service: SERVICE_VALUE[s("service") as keyof typeof SERVICE_VALUE] ?? "",
    answers: a,
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_intake", { p, p_token: token });
  if (error) {
    const msg = error.message.includes("Demasiados") ? "Recibimos varios envíos seguidos. Probá de nuevo en unos minutos." : error.message.includes("Link") ? "Este link no es válido." : "No se pudo enviar. Intentá de nuevo.";
    return { error: msg, answers: a, savedAt: Date.now() };
  }
  return { ok: true, firstName: p.first_name };
}
