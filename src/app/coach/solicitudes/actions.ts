"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAccessLink } from "@/lib/invite";
import { titleCase } from "@/lib/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setIntakeStatusAction(id: string, status: "reviewed" | "contacted" | "lost" | "archived") {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").update({ status }).eq("id", id);
  revalidatePath("/coach/solicitudes");
  revalidatePath(`/coach/solicitudes/${id}`);
}

export async function deleteIntakeAction(id: string) {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").delete().eq("id", id);
  revalidatePath("/coach/solicitudes");
  redirect("/coach/solicitudes");
}

/** Al escribirle por WhatsApp la solicitud pasa a "Contactado". */
export async function markContactedAction(id: string) {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").update({ status: "contacted" }).eq("id", id).in("status", ["new", "reviewed"]);
  revalidatePath("/coach/solicitudes");
}

export type ConvertResult =
  | { ok: true; clientId: string; firstName: string; phone: string | null; link: string | null; inviteError?: string; renewal?: string | null }
  | { ok: false; error: string; field?: "email" | "amount" };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * "Ya pagó": convierte la solicitud en cliente, registra el pago (opcional)
 * y genera el link de acceso a la app. Al entrar, la app le pide el cuestionario completo.
 */
export async function convertIntakeAction(
  intakeId: string,
  input: { email: string; amount: string; months: string; method: string },
): Promise<ConvertResult> {
  const coach = await requireRole("coach");
  if (!UUID.test(intakeId)) return { ok: false, error: "Solicitud inválida." };
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return { ok: false, error: "Escribí un correo válido.", field: "email" };
  const amount = String(input.amount ?? "").trim().replace(",", ".");
  const amountCents = amount ? Math.round(Number(amount) * 100) : null;
  if (amount && (!Number.isFinite(amountCents) || amountCents! <= 0 || amountCents! > 10_000_000)) return { ok: false, error: "Revisá el monto.", field: "amount" };
  const months = Math.min(12, Math.max(1, parseInt(String(input.months || "1"), 10) || 1));
  const method = ["link", "cash", "transfer", "other"].includes(input.method) ? input.method : "link";

  const supabase = await createClient();
  const { data: intake } = await supabase
    .from("intakes")
    .select("id, client_id, first_name, last_name, phone, birth_date, sex, height_cm, weight_kg, goal, service")
    .eq("id", intakeId)
    .maybeSingle();
  if (!intake) return { ok: false, error: "Solicitud no encontrada." };
  if (intake.client_id) return { ok: false, error: "Esta solicitud ya es cliente." };

  const svc = intake.service === "nutrition" ? { has_nutrition: true, has_training: false } : intake.service === "both" ? { has_nutrition: true, has_training: true } : intake.service ? { has_nutrition: false, has_training: true } : { has_nutrition: true, has_training: true };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  const in30 = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      coach_id: coach.id,
      first_name: titleCase(intake.first_name),
      last_name: titleCase(intake.last_name ?? ""),
      email,
      phone: intake.phone,
      goal: intake.goal,
      start_date: today,
      renewal_date: amountCents ? today : in30,
      ...svc,
    })
    .select("id, first_name")
    .single();
  if (error || !client) {
    if (error?.code === "23505") return { ok: false, error: "Ya tenés un cliente con ese correo.", field: "email" };
    return { ok: false, error: "No se pudo crear el cliente." };
  }
  const clientId = client.id as string;
  await supabase.from("client_profiles").insert({ client_id: clientId, birth_date: intake.birth_date, sex: intake.sex, height_cm: intake.height_cm });
  if (intake.weight_kg) await supabase.from("measurements").insert({ client_id: clientId, measured_at: today, weight_kg: intake.weight_kg, created_by: coach.id });
  await supabase.from("intakes").update({ client_id: clientId, status: "converted" }).eq("id", intakeId);

  let renewal: string | null = null;
  if (amountCents) {
    const { data } = await supabase.rpc("register_payment", { p_client: clientId, p_amount_cents: amountCents, p_months: months, p_method: method, p_reference: "" });
    renewal = (data as string | null) ?? null;
  }

  const invite = await createAccessLink({ clientId, email, fullName: `${client.first_name} ${intake.last_name ?? ""}`.trim() });
  // Sin revalidar: así la tarjeta con el link queda en pantalla (las páginas se leen frescas al volver)
  return {
    ok: true,
    clientId,
    firstName: client.first_name as string,
    phone: intake.phone,
    link: invite.ok ? invite.link : null,
    inviteError: invite.ok ? undefined : invite.message,
    renewal,
  };
}
