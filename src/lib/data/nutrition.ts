import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toPlanTree, type Food, type PlanMeta, type PlanTree } from "@/lib/nutrition/plan";

const TREE_SELECT =
  "*, nutrition_plan_days(id, week_number, day_number, label, meals(id, name, position, notes, meal_options(id, label, position, meal_items(id, food_id, quantity, position, food_substitutions(id, food_id, quantity, notes))))), plan_supplements(id, name, dose, timing, frequency, notes, position, created_at)";

const META_COLS =
  "id, coach_id, client_id, name, start_date, weeks, is_active, target_kcal, target_protein_g, target_carbs_g, target_fat_g, calculation, notes, updated_at";

/** Plan completo. RLS: el coach ve los suyos; el cliente solo su plan activo. */
export async function getPlanTree(planId: string): Promise<PlanTree | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutrition_plans").select(TREE_SELECT).eq("id", planId).maybeSingle();
  if (error) throw new Error("No se pudo cargar el plan.");
  return data ? toPlanTree(data) : null;
}

export async function listClientPlans(clientId: string): Promise<PlanMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_plans")
    .select(META_COLS)
    .eq("client_id", clientId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los planes.");
  return (data ?? []) as PlanMeta[];
}

export async function listTemplates(): Promise<PlanMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutrition_plans").select(META_COLS).is("client_id", null).order("name");
  if (error) throw new Error("No se pudieron cargar las plantillas.");
  return (data ?? []) as PlanMeta[];
}

/** Catálogo visible para quien consulta: global + propios del coach. */
export async function listFoods(): Promise<Food[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select("id, coach_id, name, category, reference_amount, unit, kcal, protein_g, carbs_g, fat_g, fiber_g")
    .order("name")
    .limit(2000);
  if (error) throw new Error("No se pudieron cargar los alimentos.");
  return (data ?? []).map((f) => ({
    ...f,
    reference_amount: Number(f.reference_amount),
    kcal: Number(f.kcal),
    protein_g: Number(f.protein_g),
    carbs_g: Number(f.carbs_g),
    fat_g: Number(f.fat_g),
    fiber_g: Number(f.fiber_g),
  })) as Food[];
}

/** Plan activo del cliente con sus alimentos (portal). */
export async function getActivePlanForClient(clientId: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return null;
  const tree = await getPlanTree(plan.id);
  if (!tree) return null;

  const ids = new Set<string>();
  tree.days.forEach((d) => d.meals.forEach((m) => m.options.forEach((o) => o.items.forEach((i) => {
    ids.add(i.food_id);
    i.subs.forEach((s) => ids.add(s.food_id));
  }))));
  let foods: Food[] = [];
  if (ids.size) {
    const { data } = await supabase
      .from("foods")
      .select("id, coach_id, name, category, reference_amount, unit, kcal, protein_g, carbs_g, fat_g, fiber_g")
      .in("id", [...ids]);
    foods = (data ?? []) as Food[];
  }
  return { tree, foods };
}

/** Semana del plan según su fecha de inicio (cíclica si el plan es más corto). */
export function currentPlanWeek(startDate: string | null, weeks: number, todayISO: string) {
  if (!startDate || weeks <= 1) return 1;
  const days = Math.floor((Date.parse(todayISO + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / 86_400_000);
  if (days < 0) return 1;
  return (Math.floor(days / 7) % weeks) + 1;
}

/** Día de la semana 1 = lunes … 7 = domingo. */
export function isoWeekday(todayISO: string) {
  const d = new Date(todayISO + "T00:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}
