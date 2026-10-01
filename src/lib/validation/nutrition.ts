import { z } from "zod";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const num = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (blank(v) === undefined ? undefined : Number(String(v).replace(",", "."))),
    z.number({ message: `${label}: escribí un número` }).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`),
  );

export const uuid = z.uuid("Identificador inválido");

export const planMetaSchema = z.object({
  name: z.string().trim().min(1, "Escribí un nombre").max(120),
  weeks: z.coerce.number().int().min(1, "Mínimo 1 semana").max(12, "Máximo 12 semanas"),
  start_date: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.preprocess(blank, z.string().trim().max(5000).optional()),
});

export const targetsSchema = z.object({
  target_kcal: z.number().int().min(500, "Calorías: mínimo 500").max(10000),
  target_protein_g: z.number().int().min(0).max(600),
  target_carbs_g: z.number().int().min(0).max(1500),
  target_fat_g: z.number().int().min(0).max(600),
  calculation: z
    .object({
      method: z.enum(["calculator", "manual"]),
      formula: z.enum(["mifflin", "harris", "katch", "cunningham"]).optional(),
      formula_name: z.string().max(60).optional(),
      inputs: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
      results: z.record(z.string(), z.union([z.number(), z.null()])).optional(),
      final: z.object({ kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }),
      overridden: z.boolean(),
      calculated_at: z.string().max(40),
    })
    .strict(),
});

export const foodSchema = z.object({
  name: z.string().trim().min(1, "Escribí el nombre").max(120),
  category: z.preprocess(blank, z.string().trim().max(60).optional()),
  unit: z.enum(["g", "ml", "unidad"]),
  reference_amount: num(0.01, 10000, "Porción"),
  kcal: num(0, 5000, "Calorías"),
  protein_g: num(0, 500, "Proteína"),
  carbs_g: num(0, 500, "Carbohidratos"),
  fat_g: num(0, 500, "Grasas"),
  fiber_g: z.preprocess((v) => (blank(v) === undefined ? 0 : v), num(0, 500, "Fibra")),
});

export const quantitySchema = z.number().gt(0, "La cantidad debe ser mayor a 0").max(10000, "Cantidad demasiado grande");
export const shortText = (max: number) => z.string().trim().min(1, "No puede quedar vacío").max(max);

export const supplementSchema = z.object({
  name: z.string().trim().min(1, "Escribí el suplemento").max(120, "Máximo 120 caracteres"),
  dose: z.preprocess(blank, z.string().trim().max(60, "Máximo 60 caracteres").optional()),
  timing: z.preprocess(blank, z.string().trim().max(60, "Máximo 60 caracteres").optional()),
  frequency: z.preprocess(blank, z.string().trim().max(60, "Máximo 60 caracteres").optional()),
  notes: z.preprocess(blank, z.string().trim().max(500, "Máximo 500 caracteres").optional()),
});

const intField = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (blank(v) === undefined ? undefined : Number(String(v).replace(",", "."))),
    z.number({ message: `${label}: escribí un número` }).int(`${label}: sin decimales`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`),
  );

export const dayTypeSchema = z.object({
  name: z.string().trim().min(1, "Escribí un nombre").max(40, "Máximo 40 caracteres"),
  target_kcal: intField(500, 10000, "Calorías"),
  target_protein_g: intField(0, 600, "Proteína"),
  target_carbs_g: intField(0, 1500, "Carbohidratos"),
  target_fat_g: intField(0, 600, "Grasas"),
});
export const weekdays = z.array(z.number().int().min(1).max(7)).max(7);
