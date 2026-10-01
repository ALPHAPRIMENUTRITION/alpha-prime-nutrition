import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, diffDaysISO, todayISO } from "@/lib/format";
import { hasContentAccess } from "@/lib/membership";
import type { MembershipStatus } from "@/lib/types";

export interface PortalContext {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    goal: string | null;
    start_date: string;
    renewal_date: string | null;
  };
  coachName: string;
  checkinWeekday: number;
  membership: MembershipStatus;
  hasAccess: boolean;
  subscription: { status: string; plan_name: string | null; amount_cents: number | null; current_period_end: string | null } | null;
}

/** Datos base del cliente que inició sesión. RLS solo devuelve SU ficha. */
export const getPortalContext = cache(async (): Promise<PortalContext | null> => {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, coach_id, first_name, last_name, goal, start_date, renewal_date")
    .maybeSingle();
  if (!client) return null;

  const [{ data: coach }, { data: status }, { data: subscription }] = await Promise.all([
    supabase.from("coaches").select("checkin_weekday, profiles:profiles!coaches_id_fkey(full_name)").eq("id", client.coach_id).maybeSingle(),
    supabase.rpc("membership_status", { p_client: client.id }),
    supabase.from("subscriptions").select("status, plan_name, amount_cents, current_period_end").eq("client_id", client.id).maybeSingle(),
  ]);

  const membership = (status ?? "expired") as MembershipStatus;
  const coachProfile = coach?.profiles as unknown as { full_name: string } | null;

  return {
    client,
    coachName: coachProfile?.full_name ?? "Tu coach",
    checkinWeekday: coach?.checkin_weekday ?? 1,
    membership,
    hasAccess: hasContentAccess(membership),
    subscription,
  };
});

export async function getPortalHome(clientId: string) {
  const supabase = await createClient();
  const [{ data: checkins }, { data: measurements }] = await Promise.all([
    supabase
      .from("checkins")
      .select("week_start, submitted_at, weight_kg, adherence_score, coach_adherence_override")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false })
      .limit(4),
    supabase
      .from("measurements")
      .select("measured_at, weight_kg")
      .eq("client_id", clientId)
      .not("weight_kg", "is", null)
      .order("measured_at", { ascending: true }),
  ]);
  return { checkins: checkins ?? [], measurements: measurements ?? [] };
}

/** Próxima fecha del día de check-in configurado por el coach (hoy incluido). */
export function nextCheckinDate(weekday: number, lastSubmittedAt: string | null) {
  const today = todayISO();
  const todayDow = new Date(today + "T00:00:00Z").getUTCDay();
  let next = addDaysISO(today, (weekday - todayDow + 7) % 7);
  // Si ya lo envió en los últimos 6 días, el siguiente es la semana que viene
  if (lastSubmittedAt && diffDaysISO(today, lastSubmittedAt.slice(0, 10)) < 6 && next === today) {
    next = addDaysISO(next, 7);
  }
  return next;
}

export function programWeek(startDate: string) {
  return Math.max(1, Math.floor(diffDaysISO(todayISO(), startDate) / 7) + 1);
}
