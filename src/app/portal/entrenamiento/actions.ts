"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/nutrition";
import { logSetSchema } from "@/lib/validation/training";
import { addDaysISO, todayISO } from "@/lib/format";

export type LogResult = { ok: true; id: string } | { ok: false; error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Guarda (o corrige) una serie del cliente. La base valida que el ejercicio sea de SU rutina activa. */
export async function saveSetAction(
  workoutExerciseId: string,
  date: string,
  setNumber: number,
  input: Record<string, string>,
): Promise<LogResult> {
  await requireRole("client");
  if (!uuid.safeParse(workoutExerciseId).success || !isoDate.safeParse(date).success || !z.number().int().min(1).max(30).safeParse(setNumber).success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const today = todayISO();
  if (date > today || date < addDaysISO(today, -14)) return { ok: false, error: "Solo podés registrar entrenamientos de las últimas 2 semanas." };
  const parsed = logSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  if (parsed.data.weight_kg == null && parsed.data.reps == null) return { ok: false, error: "Escribí al menos el peso o las repeticiones." };

  const supabase = await createClient();
  const [{ data: me }, { data: we }] = await Promise.all([
    supabase.from("clients").select("id").maybeSingle(),
    supabase.from("workout_exercises").select("exercise_id").eq("id", workoutExerciseId).maybeSingle(),
  ]);
  if (!me || !we) return { ok: false, error: "Ese ejercicio no está en tu rutina activa." };

  const { data, error } = await supabase
    .from("workout_logs")
    .upsert(
      {
        client_id: me.id,
        workout_exercise_id: workoutExerciseId,
        exercise_id: we.exercise_id,
        performed_at: date,
        set_number: setNumber,
        weight_kg: parsed.data.weight_kg ?? null,
        reps: parsed.data.reps ?? null,
        rir: parsed.data.rir ?? null,
        rpe: parsed.data.rpe ?? null,
        comment: parsed.data.comment ?? null,
      },
      { onConflict: "client_id,workout_exercise_id,performed_at,set_number" },
    )
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "42501") return { ok: false, error: "Tu rutina o tu membresía no permiten registrar en este momento." };
    return { ok: false, error: "No se pudo guardar la serie." };
  }
  revalidatePath("/portal/entrenamiento");
  return { ok: true, id: data.id as string };
}

export async function deleteSetAction(logId: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole("client");
  if (!uuid.safeParse(logId).success) return { ok: false, error: "Registro inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("workout_logs").delete().eq("id", logId);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/portal/entrenamiento");
  return { ok: true };
}
