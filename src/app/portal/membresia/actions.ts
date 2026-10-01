"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "@/lib/payments";

export type Result = { ok: true } | { ok: false; error: string };

/** "Ya pagué": queda pendiente hasta que el coach lo confirme. */
export async function reportPaymentAction(input: unknown): Promise<Result> {
  await requireRole("client");
  const p = reportSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_payment", { p_amount_cents: p.data.amount_cents, p_reference: p.data.reference ?? "" });
  if (error) {
    if (error.message.includes("esperando")) return { ok: false, error: "Ya tenés un pago esperando confirmación de tu coach." };
    if (error.message.includes("suspendida")) return { ok: false, error: "Tu cuenta está suspendida. Hablá con tu coach." };
    return { ok: false, error: "No se pudo enviar el aviso. Intentá de nuevo." };
  }
  revalidatePath("/portal/membresia");
  revalidatePath("/portal");
  return { ok: true };
}
