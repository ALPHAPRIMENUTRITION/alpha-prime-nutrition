"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/client";
import { foodSchema, planMetaSchema, quantitySchema, shortText, targetsSchema, uuid } from "@/lib/validation/nutrition";
import type { Food } from "@/lib/nutrition/plan";
import { z } from "zod";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
export type PlanFormState = { error?: string; fields?: Record<string, string>; ok?: boolean; savedAt?: number; values?: Record<string, string> };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const OPTION_LABELS = "ABCDEFGHIJ";

function formObject(fd: FormData) {
  return Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

/** Marca el plan como actualizado y refresca las vistas que lo muestran. */
async function touch(planId: string, revalidate = true) {
  const supabase = await createClient();
  await supabase.from("nutrition_plans").update({ updated_at: new Date().toISOString() }).eq("id", planId);
  if (revalidate) {
    revalidatePath(`/coach/planes/${planId}`);
    revalidatePath("/portal/nutricion");
  }
}

async function guard(planId: string) {
  await requireRole("coach");
  return uuid.safeParse(planId).success;
}

// ---------------------------------------------------------------- Planes

export async function createPlanAction(clientId: string | null, _prev: PlanFormState, fd: FormData): Promise<PlanFormState> {
  const coach = await requireRole("coach");
  if (clientId && !uuid.safeParse(clientId).success) return { error: "Cliente inválido." };
  const values = formObject(fd);
  const parsed = planMetaSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const supabase = await createClient();

  let planId: string | undefined;
  const templateId = values.template_id;
  if (templateId && uuid.safeParse(templateId).success) {
    const { data, error } = await supabase.rpc("nutrition_copy_plan", { p_plan: templateId, p_client: clientId, p_name: parsed.data.name });
    if (error) return { error: "No se pudo crear el plan desde la plantilla.", values, savedAt: Date.now() };
    planId = data as string;
  } else {
    const { data, error } = await supabase
      .from("nutrition_plans")
      .insert({
        coach_id: coach.id,
        client_id: clientId,
        name: parsed.data.name,
        weeks: parsed.data.weeks,
        start_date: clientId ? (parsed.data.start_date ?? null) : null,
        notes: parsed.data.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo crear el plan.", values, savedAt: Date.now() };
    planId = data.id as string;
  }

  if (clientId) revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach/planes");
  redirect(`/coach/planes/${planId}`);
}

export async function updatePlanMetaAction(planId: string, _prev: PlanFormState, fd: FormData): Promise<PlanFormState> {
  if (!(await guard(planId))) return { error: "Plan inválido." };
  const values = formObject(fd);
  const parsed = planMetaSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const supabase = await createClient();

  // No se pueden quitar semanas que ya tienen comidas
  const { data: used } = await supabase
    .from("nutrition_plan_days")
    .select("week_number, meals(id)")
    .eq("plan_id", planId)
    .gt("week_number", parsed.data.weeks);
  if ((used ?? []).some((d) => (d.meals as unknown[]).length > 0)) {
    return { fields: { weeks: "Hay comidas en semanas posteriores. Vacialas primero." }, values, savedAt: Date.now() };
  }
  await supabase.from("nutrition_plan_days").delete().eq("plan_id", planId).gt("week_number", parsed.data.weeks);

  const { error } = await supabase
    .from("nutrition_plans")
    .update({ name: parsed.data.name, weeks: parsed.data.weeks, start_date: parsed.data.start_date ?? null, notes: parsed.data.notes ?? null })
    .eq("id", planId);
  if (error) return { error: "No se pudieron guardar los cambios.", values, savedAt: Date.now() };
  await touch(planId);
  return { ok: true, savedAt: Date.now() };
}

export async function setTargetsAction(planId: string, payload: unknown): Promise<ActionResult> {
  if (!(await guard(planId))) return fail("Plan inválido.");
  const parsed = targetsSchema.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.from("nutrition_plans").update(parsed.data).eq("id", planId);
  if (error) return fail("No se pudieron guardar los objetivos.");
  await touch(planId);
  return { ok: true };
}

export async function setActiveAction(planId: string, active: boolean): Promise<ActionResult> {
  if (!(await guard(planId))) return fail("Plan inválido.");
  const supabase = await createClient();
  const { data: plan } = await supabase.from("nutrition_plans").select("client_id").eq("id", planId).maybeSingle();
  const { error } = await supabase.rpc("nutrition_set_active", { p_plan: planId, p_active: active });
  if (error) return fail("No se pudo cambiar el estado del plan.");
  if (plan?.client_id) revalidatePath(`/coach/clientes/${plan.client_id}`);
  await touch(planId);
  return { ok: true };
}

export async function duplicatePlanAction(planId: string, targetClientId: string | null, name: string): Promise<ActionResult<string>> {
  if (!(await guard(planId))) return fail("Plan inválido.");
  if (targetClientId && !uuid.safeParse(targetClientId).success) return fail("Cliente inválido.");
  const n = shortText(120).safeParse(name);
  if (!n.success) return fail("Escribí un nombre para la copia.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nutrition_copy_plan", { p_plan: planId, p_client: targetClientId, p_name: n.data });
  if (error || !data) return fail("No se pudo copiar el plan.");
  if (targetClientId) revalidatePath(`/coach/clientes/${targetClientId}`);
  revalidatePath("/coach/planes");
  return { ok: true, data: data as string };
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  if (!(await guard(planId))) return fail("Plan inválido.");
  const supabase = await createClient();
  const { data: plan } = await supabase.from("nutrition_plans").select("client_id").eq("id", planId).maybeSingle();
  const { error } = await supabase.from("nutrition_plans").delete().eq("id", planId);
  if (error) return fail("No se pudo eliminar el plan.");
  if (plan?.client_id) {
    revalidatePath(`/coach/clientes/${plan.client_id}`);
    redirect(`/coach/clientes/${plan.client_id}?tab=nutricion`);
  }
  revalidatePath("/coach/planes");
  redirect("/coach/planes");
}

// ---------------------------------------------------------------- Días

const dayRef = z.object({ week: z.number().int().min(1).max(12), day: z.number().int().min(1).max(7) });

async function ensureDay(planId: string, week: number, day: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nutrition_ensure_day", { p_plan: planId, p_week: week, p_day: day });
  if (error || !data) throw new Error("day");
  return data as string;
}

export async function setDayLabelAction(planId: string, week: number, day: number, label: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !dayRef.safeParse({ week, day }).success) return fail("Día inválido.");
  const clean = label.trim().slice(0, 60);
  try {
    const dayId = await ensureDay(planId, week, day);
    const supabase = await createClient();
    await supabase.from("nutrition_plan_days").update({ label: clean || null }).eq("id", dayId);
  } catch {
    return fail("No se pudo guardar el nombre del día.");
  }
  await touch(planId);
  return { ok: true };
}

export async function copyDayAction(planId: string, from: { week: number; day: number }, targets: { week: number; day: number }[]): Promise<ActionResult<number>> {
  if (!(await guard(planId))) return fail("Plan inválido.");
  const t = z.array(dayRef).min(1).max(84).safeParse(targets);
  if (!dayRef.safeParse(from).success || !t.success) return fail("Elegí al menos un día de destino.");
  const supabase = await createClient();
  try {
    const src = await ensureDay(planId, from.week, from.day);
    const { data, error } = await supabase.rpc("nutrition_copy_day", { p_src_day: src, p_targets: t.data });
    if (error) return fail("No se pudo copiar el día.");
    await touch(planId);
    return { ok: true, data: data as number };
  } catch {
    return fail("No se pudo copiar el día.");
  }
}

// ---------------------------------------------------------------- Comidas

export async function addMealAction(planId: string, week: number, day: number, name: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !dayRef.safeParse({ week, day }).success) return fail("Día inválido.");
  const n = shortText(80).safeParse(name);
  if (!n.success) return fail("Escribí el nombre de la comida.");
  const supabase = await createClient();
  try {
    const dayId = await ensureDay(planId, week, day);
    const { data: last } = await supabase.from("meals").select("position").eq("day_id", dayId).order("position", { ascending: false }).limit(1);
    const { data: meal, error } = await supabase
      .from("meals")
      .insert({ day_id: dayId, name: n.data, position: (last?.[0]?.position ?? -1) + 1 })
      .select("id")
      .single();
    if (error || !meal) return fail("No se pudo agregar la comida.");
    await supabase.from("meal_options").insert({ meal_id: meal.id, label: "Opción A", position: 0 });
  } catch {
    return fail("No se pudo agregar la comida.");
  }
  await touch(planId);
  return { ok: true };
}

export async function updateMealAction(planId: string, mealId: string, patch: { name?: string; notes?: string }): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(mealId).success) return fail("Comida inválida.");
  const upd: Record<string, string | null> = {};
  if (patch.name !== undefined) {
    const n = shortText(80).safeParse(patch.name);
    if (!n.success) return fail("El nombre no puede quedar vacío.");
    upd.name = n.data;
  }
  if (patch.notes !== undefined) upd.notes = patch.notes.trim().slice(0, 1000) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("meals").update(upd).eq("id", mealId);
  if (error) return fail("No se pudo guardar.");
  await touch(planId);
  return { ok: true };
}

export async function moveMealAction(planId: string, mealId: string, dir: -1 | 1): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(mealId).success) return fail("Comida inválida.");
  const supabase = await createClient();
  const { data: meal } = await supabase.from("meals").select("id, day_id, position").eq("id", mealId).maybeSingle();
  if (!meal) return fail("Comida no encontrada.");
  const { data: siblings } = await supabase.from("meals").select("id, position").eq("day_id", meal.day_id).order("position");
  const list = siblings ?? [];
  const idx = list.findIndex((m) => m.id === mealId);
  const other = list[idx + dir];
  if (!other) return { ok: true };
  // Reasigna posiciones consecutivas con el intercambio aplicado
  const reordered = [...list];
  reordered[idx] = other;
  reordered[idx + dir] = list[idx]!;
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i]!.position !== i) await supabase.from("meals").update({ position: i }).eq("id", reordered[i]!.id);
  }
  await touch(planId);
  return { ok: true };
}

export async function deleteMealAction(planId: string, mealId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(mealId).success) return fail("Comida inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) return fail("No se pudo eliminar la comida.");
  await touch(planId);
  return { ok: true };
}

export async function copyMealAction(planId: string, mealId: string, targets: { week: number; day: number }[]): Promise<ActionResult<number>> {
  if (!(await guard(planId)) || !uuid.safeParse(mealId).success) return fail("Comida inválida.");
  const t = z.array(dayRef).min(1).max(84).safeParse(targets);
  if (!t.success) return fail("Elegí al menos un día de destino.");
  const supabase = await createClient();
  try {
    for (const d of t.data) {
      const dayId = await ensureDay(planId, d.week, d.day);
      const { error } = await supabase.rpc("nutrition_copy_meal", { p_meal: mealId, p_target_day: dayId });
      if (error) return fail("No se pudo copiar la comida.");
    }
  } catch {
    return fail("No se pudo copiar la comida.");
  }
  await touch(planId);
  return { ok: true, data: t.data.length };
}

// ---------------------------------------------------------------- Opciones

export async function addOptionAction(planId: string, mealId: string, copyFromOptionId?: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(mealId).success) return fail("Comida inválida.");
  const supabase = await createClient();
  const { data: opts } = await supabase.from("meal_options").select("id, position").eq("meal_id", mealId).order("position");
  const count = opts?.length ?? 0;
  if (count >= OPTION_LABELS.length) return fail("Máximo 10 opciones por comida.");
  const { data: opt, error } = await supabase
    .from("meal_options")
    .insert({ meal_id: mealId, label: `Opción ${OPTION_LABELS[count]}`, position: (opts?.at(-1)?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !opt) return fail("No se pudo agregar la opción.");

  if (copyFromOptionId && uuid.safeParse(copyFromOptionId).success) {
    const { data: items } = await supabase.from("meal_items").select("food_id, quantity, position").eq("meal_option_id", copyFromOptionId);
    if (items?.length) await supabase.from("meal_items").insert(items.map((i) => ({ ...i, meal_option_id: opt.id })));
  }
  await touch(planId);
  return { ok: true };
}

export async function renameOptionAction(planId: string, optionId: string, label: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(optionId).success) return fail("Opción inválida.");
  const l = shortText(40).safeParse(label);
  if (!l.success) return fail("El nombre no puede quedar vacío.");
  const supabase = await createClient();
  await supabase.from("meal_options").update({ label: l.data }).eq("id", optionId);
  await touch(planId);
  return { ok: true };
}

export async function deleteOptionAction(planId: string, optionId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(optionId).success) return fail("Opción inválida.");
  const supabase = await createClient();
  const { data: opt } = await supabase.from("meal_options").select("meal_id").eq("id", optionId).maybeSingle();
  if (!opt) return fail("Opción no encontrada.");
  const { count } = await supabase.from("meal_options").select("id", { count: "exact", head: true }).eq("meal_id", opt.meal_id);
  if ((count ?? 0) <= 1) return fail("Cada comida necesita al menos una opción.");
  await supabase.from("meal_options").delete().eq("id", optionId);
  await touch(planId);
  return { ok: true };
}

// ---------------------------------------------------------------- Alimentos del plan

/** Solo se permiten alimentos que quien llama puede ver (catálogo global o propios). */
async function visibleFood(foodId: string) {
  if (!uuid.safeParse(foodId).success) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select("id").eq("id", foodId).maybeSingle();
  return Boolean(data);
}

export async function addItemAction(planId: string, optionId: string, foodId: string, quantity: number): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(optionId).success) return fail("Opción inválida.");
  const q = quantitySchema.safeParse(quantity);
  if (!q.success) return fail(q.error.issues[0]!.message);
  if (!(await visibleFood(foodId))) return fail("Alimento no encontrado.");
  const supabase = await createClient();
  const { data: last } = await supabase.from("meal_items").select("position").eq("meal_option_id", optionId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase
    .from("meal_items")
    .insert({ meal_option_id: optionId, food_id: foodId, quantity: q.data, position: (last?.[0]?.position ?? -1) + 1 });
  if (error) return fail("No se pudo agregar el alimento.");
  await touch(planId);
  return { ok: true };
}

/** Cambio de cantidad: no refresca la página (el editor ya recalculó en vivo). */
export async function updateQuantityAction(planId: string, itemId: string, quantity: number): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(itemId).success) return fail("Alimento inválido.");
  const q = quantitySchema.safeParse(quantity);
  if (!q.success) return fail(q.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("meal_items").update({ quantity: q.data }).eq("id", itemId);
  if (error) return fail("No se pudo guardar la cantidad.");
  await touch(planId, false);
  revalidatePath("/portal/nutricion");
  return { ok: true };
}

export async function deleteItemAction(planId: string, itemId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(itemId).success) return fail("Alimento inválido.");
  const supabase = await createClient();
  await supabase.from("meal_items").delete().eq("id", itemId);
  await touch(planId);
  return { ok: true };
}

export async function addSubstitutionAction(planId: string, itemId: string, foodId: string, quantity: number, notes: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(itemId).success) return fail("Alimento inválido.");
  const q = quantitySchema.safeParse(quantity);
  if (!q.success) return fail(q.error.issues[0]!.message);
  if (!(await visibleFood(foodId))) return fail("Alimento no encontrado.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("food_substitutions")
    .insert({ meal_item_id: itemId, food_id: foodId, quantity: q.data, notes: notes.trim().slice(0, 300) || null });
  if (error) return fail("No se pudo agregar la sustitución.");
  await touch(planId);
  return { ok: true };
}

export async function deleteSubstitutionAction(planId: string, subId: string): Promise<ActionResult> {
  if (!(await guard(planId)) || !uuid.safeParse(subId).success) return fail("Sustitución inválida.");
  const supabase = await createClient();
  await supabase.from("food_substitutions").delete().eq("id", subId);
  await touch(planId);
  return { ok: true };
}

// ---------------------------------------------------------------- Catálogo de alimentos

export async function saveFoodAction(foodId: string | null, input: Record<string, string>): Promise<ActionResult<Food> & { fields?: Record<string, string> }> {
  const coach = await requireRole("coach");
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los campos marcados.", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const row = { ...parsed.data, category: parsed.data.category ?? null };
  const cols = "id, coach_id, name, category, reference_amount, unit, kcal, protein_g, carbs_g, fat_g, fiber_g";

  const res = foodId
    ? uuid.safeParse(foodId).success
      ? await supabase.from("foods").update(row).eq("id", foodId).eq("coach_id", coach.id).select(cols).single()
      : null
    : await supabase.from("foods").insert({ ...row, coach_id: coach.id }).select(cols).single();
  if (!res || res.error || !res.data) return fail("No se pudo guardar el alimento.");
  revalidatePath("/coach/alimentos");
  return { ok: true, data: res.data as Food };
}

export async function deleteFoodAction(foodId: string): Promise<ActionResult> {
  const coach = await requireRole("coach");
  if (!uuid.safeParse(foodId).success) return fail("Alimento inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("foods").delete().eq("id", foodId).eq("coach_id", coach.id);
  if (error) {
    if (error.code === "23503") return fail("Este alimento se usa en un plan. Quitalo de los planes primero.");
    return fail("No se pudo eliminar el alimento.");
  }
  revalidatePath("/coach/alimentos");
  return { ok: true };
}
