import { MEASUREMENT_FIELDS } from "@/lib/validation/client";

export function ageFrom(birth: string | null | undefined) {
  if (!birth) return null;
  const b = new Date(birth + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** IMC = peso (kg) / altura (m)². Solo referencia: no distingue masa muscular. */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export const SEX_LABEL: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };

export function fieldMeta(key: string) {
  return MEASUREMENT_FIELDS.find((f) => f.key === key);
}

/** Una fila por fecha: mediciones + composición corporal unidas. */
export interface MeasurementRow {
  id: string | null;
  bodyCompId: string | null;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  neck_cm: number | null;
  shoulders_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  extra: Record<string, number>;
  notes: string | null;
}

type M = Omit<MeasurementRow, "bodyCompId" | "body_fat_pct"> & { id: string };
type B = { id: string; measured_at: string; body_fat_pct: number | null };

export function mergeMeasurements(measurements: M[], bodyComp: B[]): MeasurementRow[] {
  const num = (v: unknown) => (v == null ? null : Number(v));
  const rows: MeasurementRow[] = measurements.map((m) => ({
    id: m.id, bodyCompId: null, measured_at: m.measured_at,
    weight_kg: num(m.weight_kg), body_fat_pct: null, neck_cm: num(m.neck_cm), shoulders_cm: num(m.shoulders_cm),
    chest_cm: num(m.chest_cm), arm_cm: num(m.arm_cm), waist_cm: num(m.waist_cm), hip_cm: num(m.hip_cm),
    thigh_cm: num(m.thigh_cm), calf_cm: num(m.calf_cm), extra: (m.extra ?? {}) as Record<string, number>, notes: m.notes ?? null,
  }));
  // El % grasa se une a la última medición de esa misma fecha que aún no lo tenga
  for (const b of bodyComp) {
    const target = [...rows].reverse().find((r) => r.measured_at === b.measured_at && r.bodyCompId === null);
    if (target) {
      target.body_fat_pct = num(b.body_fat_pct);
      target.bodyCompId = b.id;
    } else {
      rows.push({
        id: null, bodyCompId: b.id, measured_at: b.measured_at, weight_kg: null, body_fat_pct: num(b.body_fat_pct),
        neck_cm: null, shoulders_cm: null, chest_cm: null, arm_cm: null, waist_cm: null, hip_cm: null, thigh_cm: null,
        calf_cm: null, extra: {}, notes: null,
      });
    }
  }
  // Orden estable: por fecha, y dentro del día en el orden de registro
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.measured_at.localeCompare(b.r.measured_at) || a.i - b.i).map((x) => x.r);
}

/** Primer y último valor registrados de un campo. */
export function firstLast(rows: MeasurementRow[], key: keyof MeasurementRow) {
  const vals = rows.filter((r) => typeof r[key] === "number") as MeasurementRow[];
  if (!vals.length) return null;
  const first = vals[0]!, last = vals[vals.length - 1]!;
  return {
    count: vals.length,
    first: first[key] as number, firstDate: first.measured_at,
    last: last[key] as number, lastDate: last.measured_at,
    diff: Math.round(((last[key] as number) - (first[key] as number)) * 10) / 10,
  };
}

export function series(rows: MeasurementRow[], key: keyof MeasurementRow) {
  return rows.filter((r) => typeof r[key] === "number").map((r) => ({ date: r.measured_at, value: r[key] as number }));
}
