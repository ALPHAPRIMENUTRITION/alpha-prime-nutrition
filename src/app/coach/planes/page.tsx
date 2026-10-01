import type { Metadata } from "next";
import Link from "next/link";
import { Apple } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/data/nutrition";
import { buttonClass, Card } from "@/components/ui";
import { PlanList } from "@/components/nutrition/plan-list";
import { NewPlanForm } from "@/components/nutrition/new-plan-form";
import type { PlanMeta } from "@/lib/nutrition/plan";

export const metadata: Metadata = { title: "Planes" };

export default async function PlansPage() {
  await requireRole("coach");
  const supabase = await createClient();
  const [templates, { data: active }] = await Promise.all([
    listTemplates(),
    supabase
      .from("nutrition_plans")
      .select("id, coach_id, client_id, name, start_date, weeks, is_active, target_kcal, target_protein_g, target_carbs_g, target_fat_g, calculation, notes, updated_at, clients(first_name, last_name)")
      .not("client_id", "is", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const activePlans = (active ?? []).map((p) => {
    const c = p.clients as unknown as { first_name: string; last_name: string } | null;
    return { ...(p as unknown as PlanMeta), name: `${c ? `${c.first_name} ${c.last_name} · ` : ""}${p.name}` };
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Nutrición</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Planes</h1>
        </div>
        <Link href="/coach/alimentos" className={buttonClass("secondary")}>
          <Apple size={17} /> Alimentos
        </Link>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="tpl-title">
        <div>
          <h2 id="tpl-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Plantillas</h2>
          <p className="text-sm text-muted">Armá un plan una vez y usalo como base para varios clientes.</p>
        </div>
        <NewPlanForm clientId={null} templates={[]} />
        <PlanList plans={templates} empty="Todavía no tenés plantillas." />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="active-title">
        <h2 id="active-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Planes activos de clientes</h2>
        {activePlans.length ? <PlanList plans={activePlans} empty="" /> : <Card className="px-6 py-8 text-center text-sm text-muted">Ningún cliente tiene un plan activo todavía.</Card>}
      </section>
    </div>
  );
}
