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
export interface PlanDay { id: string; week_number: number; day_number: number; label: string | null; day_type_id: string | null; meals: PlanMeal[] }

export interface PlanDayType {
  id: string;
  name: string;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  position: number;
}

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

export interface PlanSupplement {
  id: string;
  name: string;
  dose: string | null;
  timing: string | null;
  frequency: string | null;
  notes: string | null;
  position: number;
}

export interface PlanTree extends PlanMeta {
  days: PlanDay[];
  day_types: PlanDayType[];
  supplements: PlanSupplement[];
}

export interface DayTargetsInfo {
  type: PlanDayType | null;
  targets: { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };
}

export const TYPE_COLORS = ["#e3242f", "#3b82f6", "#3fcf8e", "#f2a93b", "#a855f7", "#14b8a6", "#ec4899"];
/** Color fijo de cada tipo de día según su orden en el plan. */
export function typeColor(types: PlanDayType[], id: string | null | undefined) {
  const i = types.findIndex((t) => t.id === id);
  return i < 0 ? null : TYPE_COLORS[i % TYPE_COLORS.length]!;
}

/** Objetivos de un día: los de su tipo de día, o los generales del plan. */
export function targetsForDay(plan: Pick<PlanTree, "day_types" | "target_kcal" | "target_protein_g" | "target_carbs_g" | "target_fat_g">, day: Pick<PlanDay, "day_type_id"> | undefined): DayTargetsInfo {
  const type = day?.day_type_id ? (plan.day_types.find((t) => t.id === day.day_type_id) ?? null) : null;
  const src = type ?? plan;
  return { type, targets: { kcal: src.target_kcal, protein: src.target_protein_g, carbs: src.target_carbs_g, fat: src.target_fat_g } };
}

/** Línea corta: "5 g · Post-entreno · Diario" */
export function supplementLine(s: Pick<PlanSupplement, "dose" | "timing" | "frequency">) {
  return [s.dose, s.timing, s.frequency].filter(Boolean).join(" · ");
}

/** Sugerencias para el formulario (el coach puede escribir cualquier otra). */
export const SUPPLEMENT_SUGGESTIONS = [
  "Creatina monohidratada", "Proteína whey", "Proteína vegetal", "Cafeína", "Multivitamínico",
  "Omega-3 (EPA/DHA)", "Vitamina D3", "Magnesio", "Electrolitos", "Beta-alanina", "Hierro", "Zinc",
];
export const SUPPLEMENT_TIMINGS = [
  "Al despertar", "En ayunas", "Con el desayuno", "Pre-entreno", "Durante el entreno", "Post-entreno",
  "Con el almuerzo", "Con la cena", "Antes de dormir",
];
export const SUPPLEMENT_FREQUENCIES = ["Diario", "Días de entreno", "Días de descanso", "Lunes a viernes"];

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
    day_type_id: d.day_type_id ?? null,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplements: PlanSupplement[] = [...(raw.plan_supplements ?? [])].sort((a: any, b: any) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({ id: s.id, name: s.name, dose: s.dose, timing: s.timing, frequency: s.frequency, notes: s.notes, position: s.position }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const day_types: PlanDayType[] = [...(raw.nutrition_day_types ?? [])].sort((a: any, b: any) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => ({ id: t.id, name: t.name, target_kcal: t.target_kcal, target_protein_g: t.target_protein_g, target_carbs_g: t.target_carbs_g, target_fat_g: t.target_fat_g, position: t.position }));
  const { nutrition_plan_days: _ignored, plan_supplements: _ignored2, nutrition_day_types: _ignored3, ...meta } = raw;
  return { ...(meta as PlanMeta), days, day_types, supplements };
}
