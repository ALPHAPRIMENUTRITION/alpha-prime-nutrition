"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clientPaymentSchema, registerSchema, settingsSchema } from "@/lib/payments";
import { uuid } from "@/lib/validation/nutrition";

export type Result = { ok: true; renewal?: string } | { ok: false; error: string };

const first = (e: z.ZodError) => e.issues[0]?.message ?? "Datos inválidos";

function refresh(clientId?: string) {
  revalidatePath("/coach/pagos");
  revalidatePath("/coach");
  if (clientId) revalidatePath(`/coach/clientes/${clientId}`);
}

/** Link general, nombre del plan, monto mensual e instrucciones. */
export async function savePaymentSettingsAction(input: unknown): Promise<Result> {
  const coach = await requireRole("coach");
  const p = settingsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: first(p.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("coaches").update(p.data).eq("id", coach.id);
  if (error) return { ok: false, error: "No se pudo guardar. Revisá que el link empiece con https://" };
  refresh();
  return { ok: true };
}

/** Link y monto propios de un cliente (vacío = usa los generales). */
export async function saveClientPaymentAction(clientId: string, input: unknown): Promise<Result> {
  await requireRole("coach");
  if (!uuid.safeParse(clientId).success) return { ok: false, error: "Cliente inválido." };
  const p = clientPaymentSchema.safeParse(input);
  if (!p.success) return { ok: false, error: first(p.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update(p.data).eq("id", clientId).select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo guardar." };
  refresh(clientId);
  return { ok: true };
}

const months = z.number().int().min(1).max(12);

export async function confirmPaymentAction(paymentId: string, m: number, clientId: string): Promise<Result> {
  await requireRole("coach");
  if (!uuid.safeParse(paymentId).success || !months.safeParse(m).success) return { ok: false, error: "Datos inválidos." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_payment", { p_payment: paymentId, p_months: m });
  if (error) return { ok: false, error: error.message.includes("revisado") ? "Ese pago ya fue revisado." : "No se pudo confirmar el pago." };
  refresh(clientId);
  return { ok: true, renewal: data as string };
}

export async function rejectPaymentAction(paymentId: string, note: string, clientId: string): Promise<Result> {
  await requireRole("coach");
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "Pago inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_payment", { p_payment: paymentId, p_note: note.slice(0, 300) });
  if (error) return { ok: false, error: error.message.includes("revisado") ? "Ese pago ya fue revisado." : "No se pudo rechazar el pago." };
  refresh(clientId);
  return { ok: true };
}

export async function registerPaymentAction(clientId: string, input: unknown): Promise<Result> {
  await requireRole("coach");
  if (!uuid.safeParse(clientId).success) return { ok: false, error: "Cliente inválido." };
  const p = registerSchema.safeParse(input);
  if (!p.success) return { ok: false, error: first(p.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_payment", {
    p_client: clientId,
    p_amount_cents: p.data.amount_cents,
    p_months: p.data.months,
    p_method: p.data.method,
    p_reference: p.data.reference ?? "",
  });
  if (error) return { ok: false, error: "No se pudo registrar el pago." };
  refresh(clientId);
  return { ok: true, renewal: data as string };
}
