// Sugerencias de sustitución: para una porción de un alimento, busca en el
// catálogo los alimentos y la cantidad que mejor reproducen sus macros.
// Es una sugerencia: el coach decide cuál agregar.

import type { Food } from "./plan";
import { unitBounds } from "./autofit";

type Vec = { kcal: number; protein: number; carbs: number; fat: number };
const KCAL_G: Record<"protein" | "carbs" | "fat", number> = { protein: 4, carbs: 4, fat: 9 };

const perUnit = (f: Food): Vec => {
  const r = Number(f.reference_amount) || 1;
  return { kcal: Number(f.kcal) / r, protein: Number(f.protein_g) / r, carbs: Number(f.carbs_g) / r, fat: Number(f.fat_g) / r };
};

export interface Equivalent {
  food: Food;
  quantity: number;
  macros: Vec;
  /** 0–100: qué tan parecido es al original */
  match: number;
}

/**
 * Criterio de intercambio: el sustituto debe tener el MISMO macro principal
 * (carbohidratos, proteína o grasa) y se calcula la cantidad que iguala los
 * gramos de ese macro. Luego se puntúa cuánto se parecen las calorías y el
 * reparto de macros.
 */
export function findEquivalents(food: Food, quantity: number, catalog: Food[], limit = 8): Equivalent[] {
  const src = perUnit(food);
  const t: Vec = { kcal: src.kcal * quantity, protein: src.protein * quantity, carbs: src.carbs * quantity, fat: src.fat * quantity };
  if (t.kcal <= 0) return [];
  const MAC = ["protein", "carbs", "fat"] as const;
  const dominant = (v: Vec) => MAC.reduce((a, b) => (v[a] * KCAL_G[a] >= v[b] * KCAL_G[b] ? a : b));
  const shares = (v: Vec) => {
    const tot = MAC.reduce((s, k) => s + v[k] * KCAL_G[k], 0) || 1;
    return MAC.map((k) => (v[k] * KCAL_G[k]) / tot);
  };
  const d = dominant(t);
  const ts = shares(t);

  const out: Equivalent[] = [];
  for (const cand of catalog) {
    if (cand.id === food.id) continue;
    const a = perUnit(cand);
    if (a.kcal <= 0 || a[d] <= 0 || dominant(a) !== d) continue;
    const b = unitBounds(cand.unit);
    const raw = t[d] / a[d];
    if (raw > b.max * 1.05) continue;
    const q = Math.max(Math.round(raw / b.step) * b.step, b.step);
    const m: Vec = { kcal: a.kcal * q, protein: a.protein * q, carbs: a.carbs * q, fat: a.fat * q };
    const kcalDiff = Math.min(Math.abs(m.kcal - t.kcal) / t.kcal, 1);
    const ms = shares(m);
    const shareDiff = ms.reduce((s, v, i) => s + Math.abs(v - ts[i]!), 0) / 2;
    const match = Math.max(0, Math.round(100 * (1 - (0.6 * kcalDiff + 0.8 * shareDiff))));
    if (match >= 50) out.push({ food: cand, quantity: q, macros: m, match });
  }
  return out.sort((x, y) => y.match - x.match).slice(0, limit);
}
