"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/client";
import { uuid } from "@/lib/validation/nutrition";
import { exerciseSchema, prescriptionSchema, weekInfoSchema, workoutMetaSchema } from "@/lib/validation/training";
import type { Exercise, Periodization } from "@/lib/training/plan";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
export type WorkoutFormState = { error?: string; fields?: Record<string, string>; ok?: boolean; savedAt?: number; values?: Record<string, string> };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const dayRef = z.object({ week: z.number().int().min(1).max(12), day: z.number().int().min(1).max(7) });

function formObject(fd: FormData) {
  return Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

/** Marca la rutina como actualizada y refresca las vistas que la muestran. */
async function touch(planId: string, revalidate = true) {
  const supabase = await createClient();
  await supabase.from("workout_plans").update({ updated_at: new Date().toISOString() }).eq("id", planId);
  if (revalidate) {
    revalidatePath(`/coach/rutinas/${planId}`);
    revalidatePath("/portal/entrenamiento");
  }
}

async function guard(planId: string) {
  await requireRole("coach");
  return uuid.safeParse(planId).success;
}

async function ensureDay(planId: string, week: number, day: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workout_ensure_day", { p_plan: planId, p_week: week, p_day: day });
  if (error || !data) throw new Error("day");
  return data as string;
}

// ---------------------------------------------------------------- Rutinas

export async function createWorkoutAction(clientId: string | null, _prev: WorkoutFormState, fd: FormData): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  if (clientId && !uuid.safeParse(clientId).success) return { error: "Cliente inválido." };
  const values = formObject(fd);
  const parsed = workoutMetaSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const supabase = await createClient();

  let planId: string;
  if (values.template_id && uuid.safeParse(values.template_id).success) {
    const { data, error } = await supabase.rpc("workout_copy_plan", { p_plan: values.template_id, p_client: clientId, p_name: parsed.data.name });
    if (error) return { error: "No se pudo crear la rutina desde la plantilla.", values, savedAt: Date.now() };
    planId = data as string;
  } else {
    const { data, error } = await supabase
      .from("workout_plans")
      .insert({
        coach_id: coach.id,
        client_id: clientId,
        name: parsed.data.name,
        weeks: parsed.data.weeks,
        start_date: clientId ? (parsed.data.start_date ?? null) : null,
        notes: parsed.data.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo crear la rutina.", values, savedAt: Date.now() };
    planId = data.id as string;
  }
  if (clientId) revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach/rutinas");
  redirect(`/coach/rutinas/${planId}`);
}

export async function updateWorkoutMetaAction(planId: string, _prev: WorkoutFormState, fd: FormData): Promise<WorkoutFormState> {
  if (!(await guard(planId))) return { error: "Rutina inválida." };
  const values = formObject(fd);
  const parsed = workoutMetaSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const supabase = await createClient();
  const { data: cur } = await supabase.from("workout_plans").select("weeks").eq("id", planId).maybeSingle();
  if (!cur) return { error: "Rutina no encontrada." };
  if (parsed.data.weeks < cur.weeks) {
    // Reducir semanas borra las semanas sobrantes
    await supabase.from("workout_days").delete().eq("plan_id", planId).gt("week_number", parsed.data.weeks);
  }
  const { error } = await supabase
    .from("workout_plans")
    .update({ name: parsed.data.name, weeks: parsed.data.weeks, start_date: parsed.data.start_date ?? null, notes: parsed.data.notes ?? null })
    .eq("id", planId);
  if (error) return { error: "No se pudieron guardar los cambios.", values, savedAt: Date.now() };
  await touch(planId);
  return { ok: true, savedAt: Date.now() };
}

export async function setWorkoutActiveAction(planId: string, active: boolean): Promise<ActionResult> {
  if (!(await guard(planId))) return fail("Rutina inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("workout_set_active", { p_plan: planId, p_active: active });
  if (error) return fail("No se pudo cambiar el estado de la rutina.");
  await touch(planId);
  return { ok: true };
}

export async function duplicateWorkoutAction(planId: string, targetClientId: string | null, name: string): Promise<ActionResult<string>> {
  if (!(await guard(planId)) || (targetClientId && !uuid.safeParse(targetClientId).success)) return fail("Datos inválidos.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workout_copy_plan", { p_plan: planId, p_client: targetClientId, p_name: name.trim().slice(0, 120) });
  if (error || !data) return fail("No se pudo duplicar la rutina.");
  revalidatePath("/coach/rutinas");
  if (targetClientId) revalidatePath(`/coach/clientes/${targetClientId}`);
  return { ok: true, data: data as string };
}

export async function deleteWorkoutAction(planId: string): Promise<ActionResult> {
  if (!(await guard(planId))) return fail("Rutina inválida.");
  const supabase = await createClient();
  const { data } = await supabase.from("workout_plans").select("client_id").eq("id", planId).maybeSingle();
  const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
  if (error) return fail("No se pudo eliminar la rutina.");
  revalidatePath("/coach/rutinas");
  if (data?.client_id) {
    revalidatePath(`/coach/clientes/${data.client_id}`);
    redirect(`/coach/clientes/${data.client_id}?tab=entrenamiento`);
  }
  redirect("/coach/rutinas");
}

// ---------------------------------------------------------------- Semanas y días

export async function setWeekInfoAction(planId: string, week: number, input: { label: string; notes: string }): Promise<ActionResult> {
  if (!(await guard(planId)) || !z.number().int().min(1).max(12).safeParse(week).success) return fail("Semana inválida.");
  const parsed = weekInfoSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { data } = await supabase.from("workout_plans").select("periodization").eq("id", planId).maybeSingle();
  const per: Periodization = (data?.periodization as Periodization | null) ?? {};
  const weeks = { ...(per.weeks ?? {}) };
  if (parsed.data.label || parsed.data.notes) weeks[String(week)] = { label: parsed.data.label || undefined, notes: parsed.data.notes || undefined };
  else delete weeks[String(week)];
  const { error } = await supabase.from("workout_plans").update({ periodization: { ...per, weeks } }).eq("id", planId);
  if (error) return fail("No se pudo guardar la semana.");
  await touch(planId);
  return { ok: true };
}

export async function setDayInfoAction(planId: string, week: number, day: number, patch: { name?: string; notes?: string }): Promise<ActionResult> {
  if (!(await guard(planId)) || !dayRef.safeParse({ week, day }).success) return fail("Día inválido.");
  const row: Record<string, string | null> = {};
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 80) || null;
  if (patch.notes !== undefined) row.notes = patch.notes.trim().slice(0, 1000) || null;
  try {
    const dayId = await ensureDay(planId, week, day);
    const supabase = await createClient();
    const { error } = await supabase.from("workout_days").update(row).eq("id", dayId);
    if (error) return fail("No se pudo guardar el día.");
  } catch {
    return fail("No se pudo guardar el día.");
  }
  await touch(planId);
  return { ok: true };
}

export async function copyWorkoutDayAction(planId: string, from: { week: number; day: number }, targets: { week: number; day: number }[]): Promise<ActionResult<number>> {
  if (!(await guard(planId))) return fail("Rutina inválida.");
  const t = z.array(dayRef).min(1).max(84).safeParse(targets);
  if (!dayRef.safeParse(from).success || !t.success) return fail("Elegí al menos un día de destino.");
  try {
    const src = await ensureDay(planId, from.week, from.day);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("workout_copy_day", { p_src_day: src, p_targets: t.data });
    if (error) return fail("No se pudo copiar el día.");
    await touch(planId);
    return { ok: true, data: data as number };
  } catch {
    return fail("No se pudo copiar el día.");
  }
}

const progressionSchema = z.object({
  weight_pct: z.number().min(-50).max(50),
  weight_kg: z.number().min(-50).max(50),
  rir_delta: z.number().min(-5).max(5),
  rpe_delta: z.number().min(-5).max(5),
});

export async function copyWeekAction(
  planId: string,
  srcWeek: number,
  targets: number[],
  progression: { weight_pct: number; weight_kg: number; rir_delta: number; rpe_delta: number },
): Promise<ActionResult<number>> {
  if (!(await guard(planId))) return fail("Rutina inválida.");
  const w = z.number().int().min(1).max(12);
  const t = z.array(w).min(1).max(12).safeParse(targets);
  const p = progressionSchema.safeParse(progression);
  if (!w.safeParse(srcWeek).success || !t.success) return fail("Elegí al menos una semana de destino.");
  if (!p.success) return fail("Revisá los valores de progresión.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workout_copy_week", {
    p_plan: planId,
    p_src_week: srcWeek,
    p_targets: t.data,
    p_weight_pct: p.data.weight_pct,
    p_weight_kg: p.data.weight_kg,
    p_rir_delta: p.data.rir_delta,
    p_rpe_delta: p.data.rpe_delta,
  });
  if (error) return fail("No se pudo copiar la semana.");
  await touch(planId);
  return { ok: true, data: data as number };
}

// ---------------------------------------------------------------- Ejercicios del día

async function visibleExercise(exerciseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("id").eq("id", exerciseId).maybeSingle();
  return !!data;
}

export async function addWorkoutExerciseAction(planId: string, week: number, day: number, exerciseId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !dayRef.safeParse({ week, day }).success || !uuid.safeParse(exerciseId).success) return fail("Datos inválidos.");
  if (!(await visibleExercise(exerciseId))) return fail("Ejercicio no disponible.");
  const supabase = await createClient();
  try {
    const dayId = await ensureDay(planId, week, day);
    const { data: last } = await supabase.from("workout_exercises").select("position").eq("day_id", dayId).order("position", { ascending: false }).limit(1);
    const position = last?.length ? Number(last[0]!.position) + 1 : 0;
    if (position >= 30) return fail("Máximo 30 ejercicios por día.");
    const { error } = await supabase.from("workout_exercises").insert({ day_id: dayId, exercise_id: exerciseId, position, sets: 3, reps: "10", rest_seconds: 90 });
    if (error) return fail("No se pudo agregar el ejercicio.");
  } catch {
    return fail("No se pudo agregar el ejercicio.");
  }
  await touch(planId);
  return { ok: true };
}

export async function updatePrescriptionAction(planId: string, rowId: string, patch: Record<string, unknown>): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(rowId).success) return fail("Ejercicio inválido.");
  const parsed = prescriptionSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercises").update(parsed.data).eq("id", rowId);
  if (error) return fail("No se pudo guardar.");
  await touch(planId, false);
  revalidatePath("/portal/entrenamiento");
  return { ok: true };
}

export async function swapWorkoutExerciseAction(planId: string, rowId: string, exerciseId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(rowId).success || !uuid.safeParse(exerciseId).success) return fail("Datos inválidos.");
  if (!(await visibleExercise(exerciseId))) return fail("Ejercicio no disponible.");
  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercises").update({ exercise_id: exerciseId }).eq("id", rowId);
  if (error) return fail("No se pudo cambiar el ejercicio.");
  await touch(planId);
  return { ok: true };
}

export async function moveWorkoutExerciseAction(planId: string, rowId: string, dir: -1 | 1): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(rowId).success) return fail("Ejercicio inválido.");
  const supabase = await createClient();
  const { data: row } = await supabase.from("workout_exercises").select("day_id").eq("id", rowId).maybeSingle();
  if (!row) return fail("Ejercicio no encontrado.");
  const { data } = await supabase.from("workout_exercises").select("id").eq("day_id", row.day_id).order("position");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(rowId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  const tmp = ids[i]!;
  ids[i] = ids[j]!;
  ids[j] = tmp;
  await Promise.all(ids.map((id, position) => supabase.from("workout_exercises").update({ position }).eq("id", id)));
  await touch(planId);
  return { ok: true };
}

export async function deleteWorkoutExerciseAction(planId: string, rowId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(rowId).success) return fail("Ejercicio inválido.");
  const supabase = await createClient();
  await supabase.from("workout_exercises").delete().eq("id", rowId);
  await touch(planId);
  return { ok: true };
}

// ---------------------------------------------------------------- Catálogo de ejercicios

export async function saveExerciseAction(exerciseId: string | null, input: Record<string, string>): Promise<ActionResult<Exercise> & { fields?: Record<string, string> }> {
  const coach = await requireRole("coach");
  if (exerciseId && !uuid.safeParse(exerciseId).success) return fail("Ejercicio inválido.");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los campos marcados.", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const row = { name: parsed.data.name, muscle_group: parsed.data.muscle_group ?? null, equipment: parsed.data.equipment ?? null, notes: parsed.data.notes ?? null };
  const q = exerciseId
    ? supabase.from("exercises").update(row).eq("id", exerciseId).eq("coach_id", coach.id)
    : supabase.from("exercises").insert({ ...row, coach_id: coach.id });
  const { data, error } = await q.select("id, coach_id, name, muscle_group, equipment, notes").single();
  if (error?.code === "23505") return { ok: false, error: "Ya existe un ejercicio con ese nombre.", fields: { name: "Ya existe un ejercicio con ese nombre" } };
  if (error || !data) return fail("No se pudo guardar el ejercicio.");
  revalidatePath("/coach/ejercicios");
  return { ok: true, data: data as Exercise };
}

export async function deleteExerciseAction(exerciseId: string): Promise<ActionResult> {
  const coach = await requireRole("coach");
  if (!uuid.safeParse(exerciseId).success) return fail("Ejercicio inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId).eq("coach_id", coach.id);
  if (error?.code === "23503") return fail("No se puede borrar: se usa en una rutina o en registros de clientes.");
  if (error) return fail("No se pudo borrar el ejercicio.");
  revalidatePath("/coach/ejercicios");
  return { ok: true };
}
