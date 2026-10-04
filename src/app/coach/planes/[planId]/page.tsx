import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPlanWeek, getPlanTree, isoWeekday, listFoods } from "@/lib/data/nutrition";
import { ageFrom } from "@/lib/anthropometry";
import { todayISO } from "@/lib/format";
import { PlanEditor } from "@/components/nutrition/plan-editor";
import type { CalcDefaults } from "@/components/nutrition/calculator";

export const metadata: Metadata = { title: "Plan nutricional" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  await requireRole("coach");
  const { planId } = await params;
  if (!UUID.test(planId)) notFound();

  const supabase = await createClient();
  const [tree, foods, { data: clientRows }] = await Promise.all([
    getPlanTree(planId),
    listFoods(),
    supabase.from("clients").select("id, first_name, last_name").order("first_name"),
  ]);
  // RLS: un plan de otro coach no se ve → 404
  if (!tree) notFound();

  let client: { id: string; name: string } | null = null;
  const defaults: CalcDefaults = { weightKg: null, heightCm: null, age: null, sex: null, bodyFatPct: null };

  if (tree.client_id) {
    const [{ data: c }, { data: p }, { data: w }, { data: bf }] = await Promise.all([
      supabase.from("clients").select("id, first_name, last_name").eq("id", tree.client_id).maybeSingle(),
      supabase.from("client_profiles").select("birth_date, sex, height_cm").eq("client_id", tree.client_id).maybeSingle(),
      supabase
        .from("measurements")
        .select("weight_kg")
        .eq("client_id", tree.client_id)
        .not("weight_kg", "is", null)
        .order("measured_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("body_composition")
        .select("body_fat_pct")
        .eq("client_id", tree.client_id)
        .not("body_fat_pct", "is", null)
        .order("measured_at", { ascending: false })
        .limit(1),
    ]);
    if (c) client = { id: c.id, name: `${c.first_name} ${c.last_name}`.trim() };
    defaults.weightKg = w?.[0]?.weight_kg != null ? Number(w[0].weight_kg) : null;
    defaults.heightCm = p?.height_cm != null ? Number(p.height_cm) : null;
    defaults.age = ageFrom(p?.birth_date);
    defaults.sex = (p?.sex as CalcDefaults["sex"]) ?? null;
    defaults.bodyFatPct = bf?.[0]?.body_fat_pct != null ? Number(bf[0].body_fat_pct) : null;

    // Lo que falte se completa con el cuestionario del cliente (el más reciente, priorizando el completo)
    const { data: intakes } = await supabase
      .from("intakes")
      .select("kind, weight_kg, height_cm, birth_date, sex, answers, created_at")
      .eq("client_id", tree.client_id)
      .order("created_at", { ascending: false })
      .limit(10);
    const rows = [...(intakes ?? [])].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "full" ? -1 : 1));
    for (const i of rows) {
      defaults.weightKg ??= i.weight_kg != null ? Number(i.weight_kg) : null;
      defaults.heightCm ??= i.height_cm != null ? Number(i.height_cm) : null;
      defaults.age ??= ageFrom(i.birth_date);
      defaults.sex ??= (i.sex as CalcDefaults["sex"]) ?? null;
    }
    const full = rows.find((r) => r.kind === "full");
    if (full) {
      const a = (full.answers ?? {}) as Record<string, string | string[]>;
      const days = Number(a.days_per_week) || 0;
      const trains = a.trains_now === "Sí";
      const job = String(a.job_activity ?? "");
      let f = !trains || days === 0 ? 1.2 : days <= 2 ? 1.375 : days <= 5 ? 1.55 : 1.725;
      if (job.startsWith("Haciendo trabajo físico")) f = Math.min(1.9, f === 1.2 ? 1.55 : f + 0.175);
      else if (job.startsWith("De pie") && f === 1.2) f = 1.375;
      defaults.activityFactor = Math.round(f * 1000) / 1000;
      defaults.activityNote = [trains ? `entrena ${days || "?"} días por semana` : "no entrena actualmente", job ? `en su trabajo pasa ${job.toLowerCase()}` : null]
        .filter(Boolean)
        .join(" · ");
    }
  }

  const today = todayISO();
  const initialWeek = tree.is_active ? currentPlanWeek(tree.start_date, tree.weeks, today) : 1;
  const initialDay = tree.is_active ? isoWeekday(today) : 1;

  return (
    <PlanEditor
      key={tree.id}
      plan={tree}
      foods={foods}
      client={client}
      clients={(clientRows ?? []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim() }))}
      calcDefaults={defaults}
      initialWeek={initialWeek}
      initialDay={initialDay}
    />
  );
}
