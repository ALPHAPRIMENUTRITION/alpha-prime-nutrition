import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toWorkoutTree, type Exercise, type LogRow, type WorkoutMeta, type WorkoutTree } from "@/lib/training/plan";

const TREE_SELECT =
  "*, workout_days(id, week_number, day_number, name, notes, workout_exercises(id, exercise_id, position, sets, reps, weight_kg, rir, rpe, rest_seconds, tempo, notes, duration_min, intensity))";
const META_COLS = "id, coach_id, client_id, name, start_date, weeks, is_active, periodization, notes, updated_at";

/** Rutina completa. RLS: el coach ve las suyas; el cliente solo su rutina activa. */
export async function getWorkoutTree(planId: string): Promise<WorkoutTree | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_plans").select(TREE_SELECT).eq("id", planId).maybeSingle();
  if (error) throw new Error("No se pudo cargar la rutina.");
  return data ? toWorkoutTree(data) : null;
}

export async function listClientWorkouts(clientId: string): Promise<WorkoutMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .select(META_COLS)
    .eq("client_id", clientId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las rutinas.");
  return (data ?? []) as WorkoutMeta[];
}

export async function listWorkoutTemplates(): Promise<WorkoutMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_plans").select(META_COLS).is("client_id", null).order("name");
  if (error) throw new Error("No se pudieron cargar las plantillas.");
  return (data ?? []) as WorkoutMeta[];
}

export async function listExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, coach_id, name, muscle_group, equipment, notes")
    .order("muscle_group")
    .order("name")
    .limit(3000);
  if (error) throw new Error("No se pudieron cargar los ejercicios.");
  return (data ?? []) as Exercise[];
}

/** Rutina activa del cliente con sus ejercicios (portal). */
export async function getActiveWorkoutForClient(clientId: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase.from("workout_plans").select("id").eq("client_id", clientId).eq("is_active", true).maybeSingle();
  if (!plan) return null;
  const tree = await getWorkoutTree(plan.id);
  if (!tree) return null;
  const ids = [...new Set(tree.days.flatMap((d) => d.exercises.map((e) => e.exercise_id)))];
  let exercises: Exercise[] = [];
  if (ids.length) {
    const { data } = await supabase.from("exercises").select("id, coach_id, name, muscle_group, equipment, notes").in("id", ids);
    exercises = (data ?? []) as Exercise[];
  }
  return { tree, exercises };
}

/**
 * TODOS los registros de cargas de un cliente (más recientes primero). RLS filtra.
 * Supabase devuelve como máximo 1.000 filas por consulta, así que se pide por páginas
 * para que el historial completo del proceso siga visible con los años.
 */
export async function getClientLogs(clientId: string, max = 50_000): Promise<LogRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const data: Record<string, unknown>[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data: page, error } = await supabase
      .from("workout_logs")
      .select("id, workout_exercise_id, exercise_id, performed_at, set_number, weight_kg, reps, rir, rpe, comment, duration_min")
      .eq("client_id", clientId)
      .order("performed_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudieron cargar los registros.");
    data.push(...(page ?? []));
    if (!page || page.length < PAGE) break;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    ...r,
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    rir: r.rir == null ? null : Number(r.rir),
    rpe: r.rpe == null ? null : Number(r.rpe),
    duration_min: r.duration_min == null ? null : Number(r.duration_min),
  })) as LogRow[];
}

/** Ejercicios (con nombre) que aparecen en los registros. */
export async function exercisesByIds(ids: string[]): Promise<Exercise[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("id, coach_id, name, muscle_group, equipment, notes").in("id", ids);
  return (data ?? []) as Exercise[];
}
