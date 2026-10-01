"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/data/portal";
import { checkinSchema, cleanAnswers, mondayOf } from "@/lib/checkin";
import { fieldErrors } from "@/lib/validation/client";
import { todayISO } from "@/lib/format";

export type CheckinResult = { ok: true; id: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Envía (o corrige, si el coach todavía no lo revisó) el check-in de esta semana. */
export async function submitCheckinAction(input: Record<string, unknown>, answers: Record<string, unknown>): Promise<CheckinResult> {
  await requireRole("client");
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Tu cuenta no tiene un programa activo." };
  if (!ctx.hasAccess) return { ok: false, error: "Tu membresía no permite enviar check-ins en este momento." };
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los campos marcados.", fields: fieldErrors(parsed.error) };
  const extra = cleanAnswers(answers, ctx.checkinConfig.questions);

  const supabase = await createClient();
  const monday = mondayOf(todayISO());
  const { data: existing } = await supabase.from("checkins").select("id, status").eq("client_id", ctx.client.id).eq("week_start", monday).maybeSingle();
  if (existing?.status === "reviewed") return { ok: false, error: "Tu coach ya revisó el check-in de esta semana." };

  const row = { ...parsed.data, extra_answers: extra };
  const res = existing
    ? await supabase.from("checkins").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("checkins").insert({ ...row, client_id: ctx.client.id, week_start: monday }).select("id").single();
  if (res.error || !res.data) return { ok: false, error: "No se pudo guardar el check-in." };
  revalidatePath("/portal/checkin");
  revalidatePath("/portal");
  return { ok: true, id: res.data.id as string };
}
