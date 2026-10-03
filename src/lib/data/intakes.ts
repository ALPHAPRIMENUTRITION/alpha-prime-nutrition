import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { IntakeAnswers } from "@/lib/intake";

export type IntakeRow = {
  id: string;
  client_id: string | null;
  status: "new" | "reviewed" | "converted" | "archived";
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  service: "nutrition" | "training" | "both" | "personal" | null;
  answers: IntakeAnswers;
  created_at: string;
};

const COLS = "id, client_id, status, first_name, last_name, email, phone, birth_date, sex, height_cm, weight_kg, goal, service, answers, created_at";

export async function listIntakes(filter: "abiertas" | "todas" = "abiertas") {
  const supabase = await createClient();
  let q = supabase.from("intakes").select(COLS).order("created_at", { ascending: false }).limit(200);
  if (filter === "abiertas") q = q.in("status", ["new", "reviewed"]);
  const { data } = await q;
  return (data ?? []) as IntakeRow[];
}

export async function getIntake(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("intakes").select(COLS).eq("id", id).maybeSingle();
  return data as IntakeRow | null;
}

export async function latestClientIntake(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("intakes").select(COLS).eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data as IntakeRow | null;
}

export async function newIntakesCount() {
  const supabase = await createClient();
  const { count } = await supabase.from("intakes").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}

export const INTAKE_STATUS_LABEL = { new: "Nueva", reviewed: "Vista", converted: "Ya es cliente", archived: "Archivada" } as const;
export const INTAKE_SERVICE_LABEL = { nutrition: "Alimentación", training: "Entrenamiento online", both: "Completo", personal: "Personal 1 a 1" } as const;
