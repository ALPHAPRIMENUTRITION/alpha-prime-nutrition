// Comparativa entre dos mediciones (como la planilla del coach):
// peso, % grasa, lb de grasa, lb de masa corporal magra (MCM), IMC,
// pliegues y circunferencias. Solo cálculos de apoyo: no son diagnósticos.
import { bmi, type MeasurementRow } from "@/lib/anthropometry";
import { kgToLb } from "@/lib/units";

/** "down" = bajar es favorable (verde); "up" = subir es favorable; "neutral" = sin color. */
export type Better = "down" | "up" | "neutral";

export interface Snapshot {
  date: string;
  values: Record<string, number | null>;
}

export interface Metric {
  key: string;
  label: string;
  unit: string;
  better: Better;
  section: "comp" | "fold" | "circ";
}

export const METRICS: Metric[] = [
  { key: "weight_lb", label: "Peso", unit: "lb", better: "neutral", section: "comp" },
  { key: "body_fat_pct", label: "% grasa", unit: "%", better: "down", section: "comp" },
  { key: "fat_lb", label: "Lb de grasa", unit: "lb", better: "down", section: "comp" },
  { key: "lean_lb", label: "Lb de MCM (masa magra)", unit: "lb", better: "up", section: "comp" },
  { key: "bmi", label: "IMC", unit: "", better: "down", section: "comp" },
  { key: "biceps_mm", label: "Bicipital", unit: "mm", better: "down", section: "fold" },
  { key: "triceps_mm", label: "Tricipital", unit: "mm", better: "down", section: "fold" },
  { key: "subscapular_mm", label: "Subescapular", unit: "mm", better: "down", section: "fold" },
  { key: "suprailiac_mm", label: "Suprailíaco", unit: "mm", better: "down", section: "fold" },
  { key: "folds_sum", label: "Suma de pliegues", unit: "mm", better: "down", section: "fold" },
  { key: "neck_cm", label: "Cuello", unit: "cm", better: "neutral", section: "circ" },
  { key: "shoulders_cm", label: "Hombros", unit: "cm", better: "neutral", section: "circ" },
  { key: "chest_cm", label: "Pecho", unit: "cm", better: "neutral", section: "circ" },
  { key: "arm_cm", label: "Brazo", unit: "cm", better: "neutral", section: "circ" },
  { key: "waist_cm", label: "Cintura", unit: "cm", better: "down", section: "circ" },
  { key: "hip_cm", label: "Cadera", unit: "cm", better: "down", section: "circ" },
  { key: "thigh_cm", label: "Muslo", unit: "cm", better: "neutral", section: "circ" },
  { key: "calf_cm", label: "Pantorrilla", unit: "cm", better: "neutral", section: "circ" },
];

const RAW_KEYS = [
  "weight_kg", "body_fat_pct", "biceps_mm", "triceps_mm", "subscapular_mm", "suprailiac_mm",
  "neck_cm", "shoulders_cm", "chest_cm", "arm_cm", "waist_cm", "hip_cm", "thigh_cm", "calf_cm",
] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Una "foto" por fecha: si ese día hay varios registros, gana el último valor cargado de cada campo. */
export function snapshotsByDate(rows: MeasurementRow[], heightCm: number | null): Snapshot[] {
  const byDate = new Map<string, Record<string, number | null>>();
  for (const r of rows) {
    const cur = byDate.get(r.measured_at) ?? {};
    for (const k of RAW_KEYS) {
      const v = r[k];
      if (v != null) cur[k] = Number(v);
    }
    byDate.set(r.measured_at, cur);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, raw]) => {
      const kg = raw.weight_kg ?? null;
      const lb = kg != null ? kgToLb(kg) : null;
      const pct = raw.body_fat_pct ?? null;
      const fat = lb != null && pct != null ? r2((lb * pct) / 100) : null;
      const folds = [raw.biceps_mm, raw.triceps_mm, raw.subscapular_mm, raw.suprailiac_mm];
      return {
        date,
        values: {
          ...raw,
          weight_lb: lb,
          fat_lb: fat,
          lean_lb: lb != null && fat != null ? r2(lb - fat) : null,
          bmi: bmi(kg, heightCm),
          folds_sum: folds.every((f) => f != null) ? r2(folds.reduce((s, f) => s! + f!, 0)!) : null,
        },
      };
    });
}

export function tone(diff: number, better: Better): "good" | "bad" | "neutral" {
  if (better === "neutral" || Math.abs(diff) < 0.005) return "neutral";
  return (better === "down" ? diff < 0 : diff > 0) ? "good" : "bad";
}
