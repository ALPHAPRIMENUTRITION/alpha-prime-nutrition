import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutTree, listExercises } from "@/lib/data/training";
import { currentPlanWeek, isoWeekday } from "@/lib/data/nutrition";
import { todayISO } from "@/lib/format";
import { WorkoutEditor } from "@/components/training/workout-editor";

export const metadata: Metadata = { title: "Rutina" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkoutPage({ params }: { params: Promise<{ planId: string }> }) {
  await requireRole("coach");
  const { planId } = await params;
  if (!UUID.test(planId)) notFound();
  const supabase = await createClient();
  const [tree, exercises, { data: clientRows }] = await Promise.all([
    getWorkoutTree(planId),
    listExercises(),
    supabase.from("clients").select("id, first_name, last_name").order("first_name"),
  ]);
  if (!tree) notFound();

  const clients = (clientRows ?? []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim() }));
  const client = tree.client_id ? (clients.find((c) => c.id === tree.client_id) ?? null) : null;
  const today = todayISO();
  const initialWeek = tree.is_active ? currentPlanWeek(tree.start_date, tree.weeks, today) : 1;
  const firstDay = tree.days.find((d) => d.week_number === initialWeek && d.exercises.length)?.day_number ?? 1;
  const initialDay = tree.is_active ? isoWeekday(today) : firstDay;

  return <WorkoutEditor key={tree.id} plan={tree} exercises={exercises} client={client} clients={clients} initialWeek={initialWeek} initialDay={initialDay} />;
}
