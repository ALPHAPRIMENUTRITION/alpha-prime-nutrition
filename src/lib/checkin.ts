// Check-in semanal: campos estándar, configuración del coach y validación.
import { z } from "zod";
import { addDaysISO } from "@/lib/format";

export type StandardKey =
  | "weight_kg"
  | "waist_cm"
  | "nutrition_adherence_pct"
  | "workouts"
  | "cardio_minutes"
  | "sleep_hours"
  | "energy"
  | "hunger"
  | "stress"
  | "comments"
  | "photos";

export const STANDARD_FIELDS: { key: StandardKey; label: string; hint?: string }[] = [
  { key: "weight_kg", label: "Peso", hint: "kg, en ayunas" },
  { key: "waist_cm", label: "Cintura", hint: "cm, a la altura del ombligo" },
  { key: "nutrition_adherence_pct", label: "Adherencia nutricional", hint: "% del plan que cumpliste" },
  { key: "workouts", label: "Entrenamientos completados" },
  { key: "cardio_minutes", label: "Cardio", hint: "minutos en la semana" },
  { key: "sleep_hours", label: "Sueño", hint: "horas promedio por noche" },
  { key: "energy", label: "Energía", hint: "1 = muy baja · 10 = excelente" },
  { key: "hunger", label: "Hambre", hint: "1 = nada · 10 = mucha" },
  { key: "stress", label: "Estrés", hint: "1 = nada · 10 = mucho" },
  { key: "comments", label: "Comentarios" },
  { key: "photos", label: "Fotos de progreso" },
];

export type QuestionType = "text" | "yesno" | "scale" | "number";
export interface CustomQuestion { id: string; label: string; type: QuestionType }
export interface CheckinConfig { hidden: StandardKey[]; questions: CustomQuestion[] }

export const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: "text", label: "Texto" },
  { id: "yesno", label: "Sí / No" },
  { id: "scale", label: "Escala 1-10" },
  { id: "number", label: "Número" },
];

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]; // 0 = domingo (como en la base)

export function parseCheckinConfig(raw: unknown): CheckinConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const keys = new Set(STANDARD_FIELDS.map((f) => f.key));
  const hidden = Array.isArray(r.hidden) ? (r.hidden.filter((k) => keys.has(k as StandardKey)) as StandardKey[]) : [];
  const questions = Array.isArray(r.questions)
    ? (r.questions as unknown[])
        .map((q) => q as Partial<CustomQuestion>)
        .filter((q) => typeof q?.id === "string" && typeof q?.label === "string" && QUESTION_TYPES.some((t) => t.id === q.type))
        .map((q) => ({ id: q.id!, label: q.label!.slice(0, 120), type: q.type! }))
        .slice(0, 15)
    : [];
  return { hidden, questions };
}

export const configSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  hidden: z.array(z.enum(STANDARD_FIELDS.map((f) => f.key) as [StandardKey, ...StandardKey[]])),
  questions: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9]{4,16}$/),
        label: z.string().trim().min(1, "Escribí la pregunta").max(120, "Máximo 120 caracteres"),
        type: z.enum(["text", "yesno", "scale", "number"]),
      }),
    )
    .max(15, "Máximo 15 preguntas"),
});

// ---------------------------------------------------------------- Fechas

/** Lunes de la semana (ISO) de una fecha YYYY-MM-DD. */
export function mondayOf(iso: string) {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay() || 7;
  return addDaysISO(iso, -(dow - 1));
}

/** Fecha del check-in dentro de la semana que empieza el lunes. weekday: 0 = domingo … 6 = sábado. */
export function dueDateOfWeek(monday: string, weekday: number) {
  return addDaysISO(monday, (weekday + 6) % 7);
}

// ---------------------------------------------------------------- Validación del envío

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const num = (min: number, max: number, label: string, int = false) =>
  z.preprocess(
    (v) => (blank(v) ? null : Number(String(v).replace(",", "."))),
    z.union([z.null(), (int ? z.number().int(`${label}: sin decimales`) : z.number({ message: `${label}: escribí un número` })).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`)]),
  );

export const checkinSchema = z.object({
  weight_kg: num(20, 400, "Peso"),
  waist_cm: num(30, 250, "Cintura"),
  nutrition_adherence_pct: num(0, 100, "Adherencia", true),
  workouts_completed: num(0, 14, "Entrenamientos", true),
  workouts_planned: num(0, 14, "Entrenamientos planificados", true),
  cardio_minutes: num(0, 3000, "Cardio", true),
  sleep_hours: num(0, 24, "Sueño"),
  energy: num(1, 10, "Energía", true),
  hunger: num(1, 10, "Hambre", true),
  stress: num(1, 10, "Estrés", true),
  comments: z.preprocess((v) => (blank(v) ? null : String(v).trim()), z.union([z.null(), z.string().max(3000, "Comentarios: máximo 3000 caracteres")])),
});

/** Respuestas a preguntas propias del coach: solo las que existen en su configuración. */
export function cleanAnswers(raw: Record<string, unknown>, questions: CustomQuestion[]) {
  const out: Record<string, string | number | boolean> = {};
  for (const q of questions) {
    const v = raw[q.id];
    if (blank(v)) continue;
    if (q.type === "yesno") out[q.id] = v === true || v === "si" || v === "true";
    else if (q.type === "scale") {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 10) out[q.id] = n;
    } else if (q.type === "number") {
      const n = Number(String(v).replace(",", "."));
      if (Number.isFinite(n) && Math.abs(n) < 1e6) out[q.id] = n;
    } else out[q.id] = String(v).trim().slice(0, 1000);
  }
  return out;
}

export interface CheckinRow {
  id: string;
  client_id: string;
  week_start: string;
  submitted_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  nutrition_adherence_pct: number | null;
  workouts_completed: number | null;
  workouts_planned: number | null;
  cardio_minutes: number | null;
  sleep_hours: number | null;
  energy: number | null;
  hunger: number | null;
  stress: number | null;
  comments: string | null;
  extra_answers: Record<string, unknown>;
  adherence_score: number | null;
  coach_adherence_override: number | null;
  coach_feedback: string | null;
  status: "submitted" | "reviewed";
  reviewed_at: string | null;
}

export const CHECKIN_COLS =
  "id, client_id, week_start, submitted_at, weight_kg, waist_cm, nutrition_adherence_pct, workouts_completed, workouts_planned, cardio_minutes, sleep_hours, energy, hunger, stress, comments, extra_answers, adherence_score, coach_adherence_override, coach_feedback, status, reviewed_at";

export function normalizeCheckin(r: Record<string, unknown>): CheckinRow {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    ...(r as unknown as CheckinRow),
    weight_kg: n(r.weight_kg),
    waist_cm: n(r.waist_cm),
    sleep_hours: n(r.sleep_hours),
    extra_answers: (r.extra_answers as Record<string, unknown>) ?? {},
  };
}

export const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
