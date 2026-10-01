// Tipos y utilidades de rutinas de entrenamiento (cliente y servidor).

export interface Exercise {
  id: string;
  coach_id: string | null;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  notes: string | null;
}

export interface WExercise {
  id: string;
  exercise_id: string;
  position: number;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
}

export interface WDay {
  id: string;
  week_number: number;
  day_number: number;
  name: string | null;
  notes: string | null;
  exercises: WExercise[];
}

export interface WeekInfo { label?: string; notes?: string }
export interface Periodization { weeks?: Record<string, WeekInfo> }

export interface WorkoutMeta {
  id: string;
  coach_id: string;
  client_id: string | null;
  name: string;
  start_date: string | null;
  weeks: number;
  is_active: boolean;
  periodization: Periodization | null;
  notes: string | null;
  updated_at: string;
}

export interface WorkoutTree extends WorkoutMeta {
  days: WDay[];
}

export const MUSCLE_GROUPS = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas", "Core", "Cardio", "Otro",
];
export const EQUIPMENT = ["Barra", "Mancuernas", "Máquina", "Polea", "Peso corporal", "Kettlebell", "Banda", "Otro"];

export const WEEK_PHASES = ["Adaptación", "Acumulación", "Intensificación", "Realización", "Descarga", "Test"];

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWorkoutTree(raw: any): WorkoutTree {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const days: WDay[] = (raw.workout_days ?? []).map((d: any) => ({
    id: d.id,
    week_number: d.week_number,
    day_number: d.day_number,
    name: d.name,
    notes: d.notes ?? null,
    exercises: (d.workout_exercises ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        position: e.position,
        sets: e.sets,
        reps: e.reps,
        weight_kg: num(e.weight_kg),
        rir: num(e.rir),
        rpe: num(e.rpe),
        rest_seconds: e.rest_seconds,
        tempo: e.tempo,
        notes: e.notes,
      }))
      .sort((a: WExercise, b: WExercise) => a.position - b.position),
  }));
  days.sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number);
  const { workout_days: _ignored, ...meta } = raw;
  return { ...(meta as WorkoutMeta), days };
}

export function formatRest(sec: number | null) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}

const n1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** "4 × 6-8 · 80 kg · RIR 2 · descanso 2:30 min · tempo 3-1-1" */
export function prescriptionLine(e: Pick<WExercise, "sets" | "reps" | "weight_kg" | "rir" | "rpe" | "rest_seconds" | "tempo">) {
  return [
    e.sets || e.reps ? `${e.sets ?? "?"} × ${e.reps ?? "?"}` : null,
    e.weight_kg != null ? `${n1(e.weight_kg)} kg` : null,
    e.rir != null ? `RIR ${n1(e.rir)}` : null,
    e.rpe != null ? `RPE ${n1(e.rpe)}` : null,
    e.rest_seconds != null ? `descanso ${formatRest(e.rest_seconds)}` : null,
    e.tempo ? `tempo ${e.tempo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 1RM estimado (Epley). Solo orientativo. */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function weekInfo(plan: Pick<WorkoutMeta, "periodization">, week: number): WeekInfo {
  return plan.periodization?.weeks?.[String(week)] ?? {};
}

/** Grupos musculares de un día, en orden de aparición. */
export function dayMuscles(day: WDay | undefined, exercises: Map<string, Exercise>) {
  const out: string[] = [];
  for (const e of day?.exercises ?? []) {
    const g = exercises.get(e.exercise_id)?.muscle_group;
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}

export interface LogRow {
  id: string;
  workout_exercise_id: string | null;
  exercise_id: string;
  performed_at: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
  comment: string | null;
}
