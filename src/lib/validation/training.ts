import { z } from "zod";

const blank = (v: unknown) => (v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? undefined : v);
const optNum = (min: number, max: number, label: string, int = false) =>
  z.preprocess(
    (v) => (blank(v) === undefined ? null : Number(String(v).replace(",", "."))),
    z.union([
      z.null(),
      (int ? z.number().int(`${label}: sin decimales`) : z.number({ message: `${label}: escribí un número` }))
        .min(min, `${label}: mínimo ${min}`)
        .max(max, `${label}: máximo ${max}`),
    ]),
  );
const optText = (max: number) => z.preprocess((v) => (blank(v) === undefined ? null : String(v).trim()), z.union([z.null(), z.string().max(max, `Máximo ${max} caracteres`)]));

export const workoutMetaSchema = z.object({
  name: z.string().trim().min(1, "Escribí un nombre").max(120),
  weeks: z.coerce.number().int().min(1, "Mínimo 1 semana").max(12, "Máximo 12 semanas"),
  start_date: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.preprocess(blank, z.string().trim().max(5000).optional()),
});

/** Prescripción de un ejercicio: todos los campos son opcionales. */
export const prescriptionSchema = z
  .object({
    sets: optNum(1, 20, "Series", true),
    reps: optText(20),
    weight_kg: optNum(0, 1000, "Peso"),
    rir: optNum(0, 10, "RIR"),
    rpe: optNum(1, 10, "RPE"),
    rest_seconds: optNum(0, 1800, "Descanso", true),
    tempo: optText(12),
    notes: optText(500),
  })
  .partial();

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Escribí el nombre").max(120),
  muscle_group: z.preprocess(blank, z.string().trim().max(60).optional()),
  equipment: z.preprocess(blank, z.string().trim().max(60).optional()),
  notes: z.preprocess(blank, z.string().trim().max(1000).optional()),
});

export const weekInfoSchema = z.object({
  label: z.string().trim().max(40, "Máximo 40 caracteres"),
  notes: z.string().trim().max(500, "Máximo 500 caracteres"),
});

export const logSetSchema = z.object({
  weight_kg: optNum(0, 1000, "Peso"),
  reps: optNum(0, 200, "Repeticiones", true),
  rir: optNum(0, 10, "RIR"),
  rpe: optNum(1, 10, "RPE"),
  comment: optText(500),
});
