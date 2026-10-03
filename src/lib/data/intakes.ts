import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { IntakeAnswers } from "@/lib/intake";
import { normalizeTemplates } from "@/lib/messages";

export type IntakeStatus = "new" | "reviewed" | "contacted" | "converted" | "lost" | "archived";
export type IntakeFilter = "pendientes" | "clientes" | "cerradas" | "todas";

export type IntakeRow = {
  id: string;
  client_id: string | null;
  status: IntakeStatus;
  kind: "short" | "full";
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

const COLS = "id, client_id, status, kind, first_name, last_name, email, phone, birth_date, sex, height_cm, weight_kg, goal, service, answers, created_at";

const OPEN: IntakeStatus[] = ["new", "reviewed", "contacted"];

export async function listIntakes(filter: IntakeFilter = "pendientes", service?: string) {
  const supabase = await createClient();
  // Las solicitudes que no se concretaron en 30 días se archivan solas
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await supabase.from("intakes").update({ status: "archived" }).in("status", OPEN).is("client_id", null).lt("created_at", cutoff);

  let q = supabase.from("intakes").select(COLS).eq("kind", "short").order("created_at", { ascending: false }).limit(300);
  if (filter === "pendientes") q = q.in("status", OPEN);
  else if (filter === "clientes") q = q.eq("status", "converted");
  else if (filter === "cerradas") q = q.in("status", ["lost", "archived"]);
  if (service && ["nutrition", "training", "both", "personal"].includes(service)) q = q.eq("service", service);
  const { data } = await q;
  return (data ?? []) as IntakeRow[];
}

/** Cuestionarios completos recién respondidos por clientes (aún sin ver). */
export async function newFullIntakes() {
  const supabase = await createClient();
  const { data } = await supabase.from("intakes").select(COLS).eq("kind", "full").eq("status", "new").order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as IntakeRow[];
}

export async function getIntake(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("intakes").select(COLS).eq("id", id).maybeSingle();
  return data as IntakeRow | null;
}

/** Cuestionario completo y solicitud corta más recientes de un cliente. */
export async function clientIntakes(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("intakes").select(COLS).eq("client_id", clientId).order("created_at", { ascending: false }).limit(20);
  const rows = (data ?? []) as IntakeRow[];
  return { full: rows.find((r) => r.kind === "full") ?? null, short: rows.find((r) => r.kind === "short") ?? null };
}

export async function hasFullIntake(clientId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("intakes").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("kind", "full");
  return (count ?? 0) > 0;
}

export async function newIntakesCount() {
  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase.from("intakes").select("id", { count: "exact", head: true }).eq("status", "new").eq("kind", "short"),
    supabase.from("intakes").select("id", { count: "exact", head: true }).eq("status", "new").eq("kind", "full"),
  ]);
  return { short: a.count ?? 0, full: b.count ?? 0 };
}

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  new: "Nueva",
  reviewed: "Vista",
  contacted: "Contactado",
  converted: "Cliente",
  lost: "No se concretó",
  archived: "Archivada",
};
export const INTAKE_SERVICE_LABEL = { nutrition: "Alimentación", training: "Entrenamiento online", both: "Completo", personal: "Personal 1 a 1" } as const;

/** Mensajes rápidos del coach (o los de fábrica si no los editó). */
export async function getTemplates(coachId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("coaches").select("message_templates").eq("id", coachId).maybeSingle();
  return normalizeTemplates(data?.message_templates);
}
