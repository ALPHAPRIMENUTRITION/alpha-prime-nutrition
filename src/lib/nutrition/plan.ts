// Tipos y cálculo de macros de los planes nutricionales.

export interface Food {
  id: string;
  coach_id: string | null;
  name: string;
  category: string | null;
  reference_amount: number;
  unit: "g" | "ml" | "unidad";
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Macros de una cantidad de alimento (en su unidad: g, ml o unidades). */
export function itemMacros(food: Food | undefined, quantity: number): Macros {
  if (!food || !(quantity > 0)) return ZERO;
  const k = quantity / Number(food.reference_amount);
  return {
    kcal: Number(food.kcal) * k,
    protein: Number(food.protein_g) * k,
    carbs: Number(food.carbs_g) * k,
    fat: Number(food.fat_g) * k,
    fiber: Number(food.fiber_g) * k,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat, fiber: a.fiber + b.fiber }),
    ZERO,
  );
}

export function unitLabel(unit: Food["unit"], qty?: number) {
  if (unit === "unidad") return qty === 1 ? "unidad" : "unidades";
  return unit;
}

export function formatQty(qty: number, unit: Food["unit"]) {
  const n = Number(qty);
  const shown = Number.isInteger(n) ? n.toString() : n.toFixed(1).replace(/\.0$/, "");
  return `${shown} ${unitLabel(unit, n)}`;
}

/** Quita acentos para buscar "platano" y encontrar "Plátano". */
export function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// ---------------------------------------------------------------- Árbol del plan

export interface PlanSub { id: string; food_id: string; quantity: number; notes: string | null }
export interface PlanItem { id: string; food_id: string; quantity: number; position: number; subs: PlanSub[] }
export interface PlanOption { id: string; label: string; position: number; items: PlanItem[] }
export interface PlanMeal { id: string; name: string; position: number; notes: string | null; options: PlanOption[] }
export interface PlanDay { id: string; week_number: number; day_number: number; label: string | null; meals: PlanMeal[] }

export interface PlanMeta {
  id: string;
  coach_id: string;
  client_id: string | null;
  name: string;
  start_date: string | null;
  weeks: number;
  is_active: boolean;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  calculation: unknown;
  notes: string | null;
  updated_at: string;
}

export interface PlanTree extends PlanMeta {
  days: PlanDay[];
}

export function optionMacros(opt: PlanOption | undefined, foods: Map<string, Food>) {
  return sumMacros((opt?.items ?? []).map((i) => itemMacros(foods.get(i.food_id), Number(i.quantity))));
}

/** Total del día usando la primera opción de cada comida. */
export function dayMacros(day: PlanDay | undefined, foods: Map<string, Food>) {
  return sumMacros((day?.meals ?? []).map((m) => optionMacros(m.options[0], foods)));
}

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Convierte la respuesta anidada de PostgREST en un árbol ordenado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPlanTree(raw: any): PlanTree {
  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const days: PlanDay[] = (raw.nutrition_plan_days ?? []).map((d: any) => ({
    id: d.id,
    week_number: d.week_number,
    day_number: d.day_number,
    label: d.label,
    meals: (d.meals ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        position: m.position,
        notes: m.notes,
        options: (m.meal_options ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((o: any) => ({
            id: o.id,
            label: o.label,
            position: o.position,
            items: (o.meal_items ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((i: any) => ({
                id: i.id,
                food_id: i.food_id,
                quantity: Number(i.quantity),
                position: i.position,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                subs: (i.food_substitutions ?? []).map((s: any) => ({ id: s.id, food_id: s.food_id, quantity: Number(s.quantity), notes: s.notes })),
              }))
              .sort(byPos),
          }))
          .sort(byPos),
      }))
      .sort(byPos),
  }));
  days.sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number);
  const { nutrition_plan_days: _ignored, ...meta } = raw;
  return { ...(meta as PlanMeta), days };
}
