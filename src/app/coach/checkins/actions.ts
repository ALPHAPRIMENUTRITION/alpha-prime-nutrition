"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { configSchema } from "@/lib/checkin";
import { uuid } from "@/lib/validation/nutrition";

export type Result = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  feedback: z.string().trim().max(3000, "Máximo 3000 caracteres"),
  override: z.union([z.null(), z.number().int().min(0, "Adherencia: mínimo 0").max(100, "Adherencia: máximo 100")]),
});

/** Devolución del coach. Al marcar revisado, el cliente recibe una notificación. */
export async function reviewCheckinAction(checkinId: string, input: { feedback: string; override: number | null }): Promise<Result> {
  await requireRole("coach");
  if (!uuid.safeParse(checkinId).success) return { ok: false, error: "Check-in inválido." };
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]!.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .update({ coach_feedback: p.data.feedback || null, coach_adherence_override: p.data.override, status: "reviewed", reviewed_at: new Date().toISOString() })
    .eq("id", checkinId)
    .select("client_id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo guardar la revisión." };
  revalidatePath("/coach/checkins");
  revalidatePath(`/coach/clientes/${data.client_id}`);
  revalidatePath("/coach");
  return { ok: true };
}

export async function saveCheckinConfigAction(input: unknown): Promise<Result> {
  const coach = await requireRole("coach");
  const p = configSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("coaches")
    .update({ checkin_weekday: p.data.weekday, checkin_config: { hidden: p.data.hidden, questions: p.data.questions } })
    .eq("id", coach.id);
  if (error) return { ok: false, error: "No se pudo guardar la configuración." };
  revalidatePath("/coach/checkins");
  return { ok: true };
}
