// Auto-ajuste de cantidades: el coach elige los alimentos y esto PROPONE
// cantidades para acercarse a los objetivos. Es una sugerencia: nada se
// guarda hasta que el coach la revisa y la aplica.
//
// Método: mínimos cuadrados ponderados con límites por alimento.
//   minimizar  Σ_k w_k·((Σ_i a_ik·x_i − t_k)/t_k)²  +  λ·Σ_i ((x_i − x0_i)/s_i)²
//   con        min_i ≤ x_i ≤ max_i
// k = kcal, proteína, carbohidratos, grasa (error relativo a cada objetivo).
// El segundo término (débil) mantiene las proporciones que el coach puso.
// Se resuelve por descenso por coordenadas (función cuadrática convexa con
// límites de caja → converge al óptimo) y luego se redondea a porciones
// prácticas (5 g, 10 ml, 1 unidad) con un ajuste fino local.

import type { Food } from "./plan";

export interface FitTargets { kcal: number; protein: number; carbs: number; fat: number }
export interface FitItem { id: string; food: Food; quantity: number; locked: boolean }
export interface FitResult {
  quantities: Map<string, number>;
  totals: FitTargets;
  /** Macros que quedan lejos (>10 %) aun después del ajuste */
  gaps: { key: keyof FitTargets; diff: number }[];
}

const KEYS: (keyof FitTargets)[] = ["kcal", "protein", "carbs", "fat"];
const WEIGHTS: FitTargets = { kcal: 1.2, protein: 1, carbs: 0.8, fat: 0.8 };
const LAMBDA = 0.004;

export function unitBounds(unit: Food["unit"]) {
  if (unit === "unidad") return { step: 1, min: 1, max: 12, scale: 2 };
  if (unit === "ml") return { step: 10, min: 20, max: 1000, scale: 200 };
  return { step: 5, min: 5, max: 600, scale: 100 };
}

function perUnit(food: Food): FitTargets {
  const r = Number(food.reference_amount) || 1;
  return { kcal: Number(food.kcal) / r, protein: Number(food.protein_g) / r, carbs: Number(food.carbs_g) / r, fat: Number(food.fat_g) / r };
}

/** Peso extra para los macros que el coach marca como prioridad (se cumplen primero). */
const PRIORITY_BOOST = 40;

export function fitQuantities(items: FitItem[], targets: FitTargets, priority: Partial<Record<keyof FitTargets, boolean>> = {}): FitResult {
  const t = KEYS.map((k) => Math.max(targets[k], 1));
  const w = KEYS.map((k) => WEIGHTS[k] * (priority[k] ? PRIORITY_BOOST : 1));
  const a = items.map((it) => { const p = perUnit(it.food); return KEYS.map((k) => p[k]); });
  const b = items.map((it) => unitBounds(it.food.unit));
  const x0 = items.map((it) => Math.max(Number(it.quantity) || 0, 0));
  const s = items.map((it, i) => Math.max(x0[i]!, b[i]!.scale));
  const free = items.map((it) => !it.locked);
  const x = x0.map((v, i) => (free[i] ? Math.min(Math.max(v || b[i]!.scale, b[i]!.min), b[i]!.max) : v));

  // residuo r_k = Σ a_ik x_i − t_k
  const r = KEYS.map((_, k) => x.reduce((acc, xi, i) => acc + a[i]![k]! * xi, 0) - t[k]!);
  const objective = (xs: number[]) => {
    let f = 0;
    for (let k = 0; k < KEYS.length; k++) {
      const tot = xs.reduce((acc, xi, i) => acc + a[i]![k]! * xi, 0);
      f += w[k]! * ((tot - t[k]!) / t[k]!) ** 2;
    }
    xs.forEach((xi, i) => { if (free[i]) f += LAMBDA * ((xi - x0[i]!) / s[i]!) ** 2; });
    return f;
  };

  // 1) óptimo continuo
  for (let sweep = 0; sweep < 400; sweep++) {
    let moved = 0;
    for (let i = 0; i < x.length; i++) {
      if (!free[i]) continue;
      let g = 0;
      let hh = 0;
      for (let k = 0; k < KEYS.length; k++) {
        const c = w[k]! / (t[k]! * t[k]!);
        g += 2 * c * a[i]![k]! * r[k]!;
        hh += 2 * c * a[i]![k]! * a[i]![k]!;
      }
      g += (2 * LAMBDA * (x[i]! - x0[i]!)) / (s[i]! * s[i]!);
      hh += (2 * LAMBDA) / (s[i]! * s[i]!);
      if (hh <= 0) continue;
      const nx = Math.min(Math.max(x[i]! - g / hh, b[i]!.min), b[i]!.max);
      const d = nx - x[i]!;
      if (d !== 0) {
        for (let k = 0; k < KEYS.length; k++) r[k] = r[k]! + a[i]![k]! * d;
        x[i] = nx;
        moved = Math.max(moved, Math.abs(d) / b[i]!.step);
      }
    }
    if (moved < 1e-4) break;
  }

  // 2) redondeo a porciones prácticas + ajuste fino (±1 porción si mejora)
  const xr = x.map((v, i) => (free[i] ? Math.min(Math.max(Math.round(v / b[i]!.step) * b[i]!.step, b[i]!.min), b[i]!.max) : v));
  let best = objective(xr);
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (let i = 0; i < xr.length; i++) {
      if (!free[i]) continue;
      for (const dir of [-1, 1]) {
        const cand = xr[i]! + dir * b[i]!.step;
        if (cand < b[i]!.min || cand > b[i]!.max) continue;
        const old = xr[i]!;
        xr[i] = cand;
        const f = objective(xr);
        if (f < best - 1e-12) { best = f; improved = true; } else xr[i] = old;
      }
    }
    if (!improved) break;
  }

  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  xr.forEach((xi, i) => KEYS.forEach((k, j) => (totals[k] += a[i]![j]! * xi)));
  const gaps = KEYS.map((k) => ({ key: k, diff: totals[k] - targets[k] }))
    .filter((g) => targets[g.key] > 0 && Math.abs(g.diff) / targets[g.key] > 0.1);

  return { quantities: new Map(items.map((it, i) => [it.id, xr[i]!])), totals, gaps };
}
