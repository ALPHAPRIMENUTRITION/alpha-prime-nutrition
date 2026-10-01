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

/** Unidad de carga en entrenamiento. Los valores se guardan tal cual se escriben (en libras). */
export const LOAD_UNIT = "lb";

export const MUSCLE_GROUPS = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Cuádriceps", "Isquiotibiales", "Glúteos", "Aductores", "Pantorrillas", "Core", "Cardio", "Otro",
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

/** "4 × 6-8 · 135 lb · RIR 2 · descanso 2:30 min · tempo 3-1-1" */
export function prescriptionLine(e: Pick<WExercise, "sets" | "reps" | "weight_kg" | "rir" | "rpe" | "rest_seconds" | "tempo">) {
  return [
    e.sets || e.reps ? `${e.sets ?? "?"} × ${e.reps ?? "?"}` : null,
    e.weight_kg != null ? `${n1(e.weight_kg)} ${LOAD_UNIT}` : null,
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

/** "6-8" → {min 6, max 8} · "10" → {10, 10} · "AMRAP" → null */
export function parseRepRange(reps: string | null): { min: number; max: number } | null {
  if (!reps) return null;
  const m = reps.trim().match(/^(\d{1,3})\s*(?:[-–a]\s*(\d{1,3}))?$/i);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export interface Suggestion {
  weight: number | null;
  reps: string | null;
  kind: "start" | "up" | "reps" | "hold";
  note: string;
}

const fmtW = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Sugerencia para la próxima sesión (doble progresión): si en la sesión
 * anterior llegó al tope del rango de repeticiones en todas las series con su
 * peso más alto, sugiere subir peso; si no, mantener y sumar repeticiones.
 * Es solo una guía: subir o bajar entre sesiones es normal.
 */
export function suggestNext(row: Pick<WExercise, "reps" | "weight_kg" | "rir" | "sets">, prevSets: LogRow[]): Suggestion | null {
  const range = parseRepRange(row.reps);
  const withW = prevSets.filter((s) => s.weight_kg != null && s.weight_kg > 0 && s.reps != null);
  if (!withW.length) {
    if (row.weight_kg != null) return { weight: row.weight_kg, reps: row.reps, kind: "start", note: `Empezá con ${fmtW(row.weight_kg)} ${LOAD_UNIT} (indicado por tu coach) y ajustá según cómo te sientas.` };
    return null;
  }
  const top = Math.max(...withW.map((s) => s.weight_kg!));
  const atTop = withW.filter((s) => s.weight_kg === top);
  const goal = range?.max ?? Math.max(...atTop.map((s) => s.reps!));
  const floor = range?.min ?? goal;
  const reachedAll = atTop.every((s) => s.reps! >= goal);
  // Si lo hizo mucho más pesado de lo indicado (RIR muy por debajo), no subir.
  const tooHard = row.rir != null && atTop.some((s) => s.rir != null && s.rir < row.rir! - 1);
  const inc = top >= 100 ? 5 : 2.5;
  const repsText = range ? (range.min === range.max ? String(range.min) : `${range.min}-${range.max}`) : String(goal);

  if (reachedAll && !tooHard) {
    return { weight: top + inc, reps: repsText, kind: "up", note: `La vez pasada completaste ${goal} reps con ${fmtW(top)} ${LOAD_UNIT}. Si te sentís bien, probá ${fmtW(top + inc)} ${LOAD_UNIT}.` };
  }
  if (reachedAll && tooHard) {
    return { weight: top, reps: repsText, kind: "hold", note: `Llegaste a ${goal} reps con ${fmtW(top)} ${LOAD_UNIT}, pero con poco margen. Mantené el peso hasta que se sienta más controlado.` };
  }
  if (atTop.some((s) => s.reps! >= floor)) {
    return { weight: top, reps: repsText, kind: "reps", note: `Mantené ${fmtW(top)} ${LOAD_UNIT} y buscá sumar 1 repetición en alguna serie (meta: ${goal}).` };
  }
  return { weight: top, reps: repsText, kind: "hold", note: `Mantené ${fmtW(top)} ${LOAD_UNIT} o ajustá el peso para completar ${floor} reps con buena técnica.` };
}

/** Lunes (ISO) de la semana de una fecha YYYY-MM-DD. */
export function weekStart(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (wd - 1));
  return d.toISOString().slice(0, 10);
}
