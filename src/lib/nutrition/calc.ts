// Calculadora nutricional. Herramienta de apoyo: el coach revisa y puede
// sobrescribir cualquier resultado. Ninguna fórmula es universalmente correcta.

export type Sex = "male" | "female";
export type FormulaId = "mifflin" | "harris" | "katch" | "cunningham";

export const FORMULAS: Record<FormulaId, { name: string; reference: string; needs: "sex" | "lean_mass"; description: string }> = {
  mifflin: {
    name: "Mifflin-St Jeor",
    reference: "Mifflin et al., 1990",
    needs: "sex",
    description: "Usa peso, altura, edad y sexo. Referencia común para población general.",
  },
  harris: {
    name: "Harris-Benedict revisada",
    reference: "Roza & Shizgal, 1984",
    needs: "sex",
    description: "Usa peso, altura, edad y sexo. Tiende a dar valores algo más altos que Mifflin.",
  },
  katch: {
    name: "Katch-McArdle",
    reference: "Katch & McArdle",
    needs: "lean_mass",
    description: "Usa la masa libre de grasa. Requiere un % de grasa confiable.",
  },
  cunningham: {
    name: "Cunningham",
    reference: "Cunningham, 1980",
    needs: "lean_mass",
    description: "Usa la masa libre de grasa. Suele usarse en personas entrenadas.",
  },
};

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sedentario", hint: "Poco o nada de ejercicio" },
  { value: 1.375, label: "Ligero", hint: "Ejercicio 1–3 días por semana" },
  { value: 1.55, label: "Moderado", hint: "Ejercicio 3–5 días por semana" },
  { value: 1.725, label: "Alto", hint: "Ejercicio 6–7 días por semana" },
  { value: 1.9, label: "Muy alto", hint: "Doble sesión o trabajo físico intenso" },
] as const;

export interface CalcInput {
  formula: FormulaId;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  bodyFatPct: number | null;
  activityFactor: number;
  adjustMode: "pct" | "kcal";
  adjustValue: number; // −20 = déficit 20 % ; +300 = superávit de 300 kcal
  proteinPerKg: number;
  fatMode: "pct" | "per_kg";
  fatValue: number; // % de las calorías, o g/kg
}

export interface CalcResult {
  bmr: number;
  tdee: number;
  targetKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  leanMassKg: number | null;
  warnings: string[];
}

export function leanMass(weightKg: number, bodyFatPct: number | null) {
  if (bodyFatPct == null || !Number.isFinite(bodyFatPct) || bodyFatPct <= 0 || bodyFatPct >= 75) return null;
  return weightKg * (1 - bodyFatPct / 100);
}

/** TMB (kcal/día) según la fórmula elegida, o null si faltan datos. */
export function bmr(i: Pick<CalcInput, "formula" | "sex" | "weightKg" | "heightCm" | "age" | "bodyFatPct">): number | null {
  const { weightKg: w, heightCm: h, age: a } = i;
  switch (i.formula) {
    case "mifflin":
      if (!w || !h || !a) return null;
      return 10 * w + 6.25 * h - 5 * a + (i.sex === "male" ? 5 : -161);
    case "harris":
      if (!w || !h || !a) return null;
      return i.sex === "male"
        ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
        : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;
    case "katch": {
      const lbm = leanMass(w, i.bodyFatPct);
      return lbm == null ? null : 370 + 21.6 * lbm;
    }
    case "cunningham": {
      const lbm = leanMass(w, i.bodyFatPct);
      return lbm == null ? null : 500 + 22 * lbm;
    }
  }
}

export function calculate(i: CalcInput): CalcResult | null {
  const base = bmr(i);
  if (base == null || !(i.activityFactor > 0)) return null;

  const warnings: string[] = [];
  const tdee = base * i.activityFactor;
  const target = i.adjustMode === "pct" ? tdee * (1 + i.adjustValue / 100) : tdee + i.adjustValue;

  const proteinG = i.proteinPerKg * i.weightKg;
  const fatG = i.fatMode === "pct" ? (target * i.fatValue) / 100 / 9 : i.fatValue * i.weightKg;
  const carbsG = (target - proteinG * 4 - fatG * 9) / 4;

  if (carbsG < 0) warnings.push("Proteínas y grasas superan las calorías objetivo: los carbohidratos quedan en negativo.");
  if (target < base) warnings.push("Las calorías objetivo quedan por debajo de la TMB calculada.");
  if (i.adjustMode === "pct" && Math.abs(i.adjustValue) > 30) warnings.push("El ajuste supera ±30 % del gasto total.");

  return {
    bmr: Math.round(base),
    tdee: Math.round(tdee),
    targetKcal: Math.round(target),
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbsG: Math.max(0, Math.round(carbsG)),
    leanMassKg: leanMass(i.weightKg, i.bodyFatPct) != null ? Math.round(leanMass(i.weightKg, i.bodyFatPct)! * 10) / 10 : null,
    warnings,
  };
}

/** Calorías que aportan unos macros (4/4/9). */
export function kcalFromMacros(p: number, c: number, f: number) {
  return Math.round(p * 4 + c * 4 + f * 9);
}

/** Registro que se guarda con el plan: fórmula, datos, resultado y ajuste del coach. */
export interface CalculationSnapshot {
  method: "calculator" | "manual";
  formula?: FormulaId;
  formula_name?: string;
  inputs?: Omit<CalcInput, "formula">;
  results?: Pick<CalcResult, "bmr" | "tdee" | "targetKcal" | "proteinG" | "fatG" | "carbsG" | "leanMassKg">;
  final: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  overridden: boolean;
  calculated_at: string;
}
