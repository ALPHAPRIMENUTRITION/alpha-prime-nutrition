import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listWorkoutTemplates } from "@/lib/data/training";
import { buttonClass, Card } from "@/components/ui";
import { WorkoutList } from "@/components/training/workout-list";
import { NewWorkoutForm } from "@/components/training/new-workout-form";
import { PlansSwitch } from "@/components/coach/plans-switch";
import type { WorkoutMeta } from "@/lib/training/plan";

export const metadata: Metadata = { title: "Rutinas" };

export default async function WorkoutsPage() {
  await requireRole("coach");
  const supabase = await createClient();
  const [templates, { data: active }] = await Promise.all([
    listWorkoutTemplates(),
    supabase
      .from("workout_plans")
      .select("id, coach_id, client_id, name, start_date, weeks, is_active, periodization, notes, updated_at, clients(first_name, last_name)")
      .not("client_id", "is", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);
  const activePlans = (active ?? []).map((p) => {
    const c = p.clients as unknown as { first_name: string; last_name: string } | null;
    return { ...(p as unknown as WorkoutMeta), name: `${c ? `${c.first_name} ${c.last_name} · ` : ""}${p.name}` };
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PlansSwitch current="rutinas" />
          <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Rutinas</h1>
        </div>
        <Link href="/coach/ejercicios" className={buttonClass("secondary")}>
          <Dumbbell size={17} /> Ejercicios
        </Link>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="wtpl-title">
        <div>
          <h2 id="wtpl-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Plantillas</h2>
          <p className="text-sm text-muted">Armá una rutina una vez y usala como base para varios clientes.</p>
        </div>
        <NewWorkoutForm clientId={null} templates={[]} />
        <WorkoutList plans={templates} empty="Todavía no tenés plantillas de entrenamiento." />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="wactive-title">
        <h2 id="wactive-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Rutinas activas de clientes</h2>
        {activePlans.length ? <WorkoutList plans={activePlans} empty="" /> : <Card className="px-6 py-8 text-center text-sm text-muted">Ningún cliente tiene una rutina activa todavía.</Card>}
      </section>
    </div>
  );
}
