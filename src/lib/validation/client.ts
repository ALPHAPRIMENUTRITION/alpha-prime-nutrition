import { z } from "zod";

// Convierte "" en undefined para campos opcionales de formularios.
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const optNum = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (blank(v) === undefined ? undefined : Number(String(v).replace(",", "."))),
    z.number({ message: `${label}: escribí un número` }).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`).optional(),
  );
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const optDate = z.preprocess(blank, isoDate.optional());

export const clientSchema = z
  .object({
    first_name: z.string().trim().min(1, "Escribí el nombre").max(80),
    last_name: z.string().trim().min(1, "Escribí el apellido").max(80),
    email: z.email("Correo inválido").max(254).transform((v) => v.trim().toLowerCase()),
    phone: optText(30),
    birth_date: optDate,
    sex: z.preprocess(blank, z.enum(["male", "female", "other"]).optional()),
    height_cm: optNum(50, 260, "Altura"),
    goal: optText(200),
    start_date: isoDate,
    renewal_date: optDate,
    service: z.enum(["both", "nutrition", "training"], { message: "Elegí el servicio" }).default("both"),
  })
  .refine((d) => !d.renewal_date || d.renewal_date >= d.start_date, {
    message: "La renovación no puede ser antes del inicio",
    path: ["renewal_date"],
  });

export const newClientSchema = clientSchema.and(
  z.object({
    weight_kg: optNum(40, 900, "Peso inicial"),
    note: optText(5000),
    create_account: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  }),
);

export type ClientInput = z.infer<typeof clientSchema>;

export const MEASUREMENT_FIELDS = [
  { key: "weight_kg", label: "Peso", unit: "lb", min: 40, max: 900, group: "basic" },
  { key: "body_fat_pct", label: "% grasa", unit: "%", min: 2, max: 75, group: "basic" },
  { key: "biceps_mm", label: "Bicipital", unit: "mm", min: 1, max: 80, group: "fold" },
  { key: "triceps_mm", label: "Tricipital", unit: "mm", min: 1, max: 80, group: "fold" },
  { key: "subscapular_mm", label: "Subescapular", unit: "mm", min: 1, max: 80, group: "fold" },
  { key: "suprailiac_mm", label: "Suprailíaco", unit: "mm", min: 1, max: 80, group: "fold" },
  { key: "neck_cm", label: "Cuello", unit: "cm", min: 10, max: 100, group: "circ" },
  { key: "shoulders_cm", label: "Hombros", unit: "cm", min: 40, max: 250, group: "circ" },
  { key: "chest_cm", label: "Pecho", unit: "cm", min: 40, max: 250, group: "circ" },
  { key: "arm_cm", label: "Brazo", unit: "cm", min: 10, max: 100, group: "circ" },
  { key: "waist_cm", label: "Cintura", unit: "cm", min: 30, max: 250, group: "circ" },
  { key: "hip_cm", label: "Cadera", unit: "cm", min: 40, max: 250, group: "circ" },
  { key: "thigh_cm", label: "Muslo", unit: "cm", min: 20, max: 150, group: "circ" },
  { key: "calf_cm", label: "Pantorrilla", unit: "cm", min: 15, max: 100, group: "circ" },
] as const;

export const MEASUREMENT_GROUPS = [
  { id: "basic", label: "Peso y composición" },
  { id: "fold", label: "Pliegues cutáneos" },
  { id: "circ", label: "Circunferencias" },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

export const measurementSchema = z
  .object({
    measured_at: isoDate,
    notes: optText(1000),
    fat_method: optText(60),
    ...Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, optNum(f.min, f.max, f.label)])),
  })
  .passthrough();

export const noteSchema = z.object({ body: z.string().trim().min(1, "Escribí la nota").max(5000) });

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}
