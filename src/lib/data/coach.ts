import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ClientOverviewRow, CoachDashboardStats } from "@/lib/types";
import type { ClientFilter } from "@/lib/client-filters";
import { EXPIRING_SOON_DAYS, LOW_ADHERENCE_PCT } from "@/lib/membership";

// Todas las consultas usan la sesión del coach: RLS limita los resultados
// a sus propios clientes aunque se omitiera el filtro coach_id.

const OVERVIEW_COLUMNS =
  "id, coach_id, first_name, last_name, email, goal, status, start_date, renewal_date, avatar_url, current_weight_kg, current_body_fat_pct, adherence_pct, last_checkin_at, membership_status, days_to_renewal, checkin_pending";

/** Quita los caracteres con significado en los filtros de PostgREST. */
function sanitizeSearch(q: string) {
  return q.replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getDashboardStats(): Promise<CoachDashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("coach_dashboard_stats");
  if (error) throw new Error("No se pudieron cargar las métricas.");
  return data as CoachDashboardStats;
}

export async function listClients(coachId: string, opts: { q: string; filtro: ClientFilter }): Promise<ClientOverviewRow[]> {
  const supabase = await createClient();
  let query = supabase.from("coach_client_overview").select(OVERVIEW_COLUMNS).eq("coach_id", coachId);

  switch (opts.filtro) {
    case "activos":
      query = query.in("membership_status", ["active", "past_due"]);
      break;
    case "por-vencer":
      query = query.eq("membership_status", "active").gte("days_to_renewal", 0).lte("days_to_renewal", EXPIRING_SOON_DAYS);
      break;
    case "vencidos":
      query = query.in("membership_status", ["grace", "expired", "past_due"]);
      break;
    case "suspendidos":
      query = query.eq("membership_status", "suspended");
      break;
    case "checkin":
      query = query.eq("checkin_pending", true);
      break;
    case "baja-adherencia":
      query = query.lt("adherence_pct", LOW_ADHERENCE_PCT);
      break;
  }

  const term = sanitizeSearch(opts.q);
  if (term) {
    const words = term.split(" ");
    for (const w of words) {
      query = query.or(`first_name.ilike.*${w}*,last_name.ilike.*${w}*,email.ilike.*${w}*`);
    }
  }

  const { data, error } = await query.order("first_name").limit(500);
  if (error) throw new Error("No se pudo cargar la lista de clientes.");
  return (data ?? []) as ClientOverviewRow[];
}

export async function upcomingRenewals(coachId: string, withinDays = 14) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_client_overview")
    .select("id, first_name, last_name, renewal_date, days_to_renewal, membership_status")
    .eq("coach_id", coachId)
    .neq("membership_status", "suspended")
    .gte("days_to_renewal", 0)
    .lte("days_to_renewal", withinDays)
    .order("days_to_renewal")
    .limit(6);
  if (error) throw new Error("No se pudieron cargar las renovaciones.");
  return data ?? [];
}

export async function recentNotifications(limit = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("No se pudieron cargar las alertas.");
  return data ?? [];
}

export async function overdueClients(coachId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_client_overview")
    .select("id, first_name, last_name, membership_status, renewal_date, days_to_renewal")
    .eq("coach_id", coachId)
    .in("membership_status", ["past_due", "grace", "expired"])
    .order("days_to_renewal")
    .limit(6);
  if (error) throw new Error("No se pudieron cargar los pagos vencidos.");
  return data ?? [];
}
