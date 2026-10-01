import "server-only";
import { createClient } from "@/lib/supabase/server";
import { CHECKIN_COLS, normalizeCheckin, type CheckinRow } from "@/lib/checkin";

export interface CheckinPhoto { id: string; checkin_id: string; pose: string; url: string }

/** Check-ins de un cliente, del más reciente al más antiguo. RLS filtra. */
export async function getClientCheckins(clientId: string, limit = 104): Promise<CheckinRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checkins").select(CHECKIN_COLS).eq("client_id", clientId).order("week_start", { ascending: false }).limit(limit);
  if (error) throw new Error("No se pudieron cargar los check-ins.");
  return (data ?? []).map((r) => normalizeCheckin(r));
}

/** Fotos de esos check-ins con URL firmada (1 hora). */
export async function getCheckinPhotos(checkinIds: string[]): Promise<Map<string, CheckinPhoto[]>> {
  const out = new Map<string, CheckinPhoto[]>();
  if (!checkinIds.length) return out;
  const supabase = await createClient();
  const { data } = await supabase.from("progress_photos").select("id, checkin_id, pose, storage_path").in("checkin_id", checkinIds);
  if (!data?.length) return out;
  const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrls(data.map((p) => p.storage_path), 3600);
  data.forEach((p, i) => {
    const url = signed?.[i]?.signedUrl;
    if (!url) return;
    const list = out.get(p.checkin_id as string) ?? [];
    list.push({ id: p.id, checkin_id: p.checkin_id as string, pose: p.pose, url });
    out.set(p.checkin_id as string, list);
  });
  return out;
}

export interface CoachCheckin extends CheckinRow {
  client_name: string;
  previous: CheckinRow | null;
}

/** Check-ins para la bandeja del coach con el anterior de cada cliente (para comparar). */
export async function listCoachCheckins(status: "submitted" | "reviewed", limit = 40): Promise<CoachCheckin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select(`${CHECKIN_COLS}, clients(first_name, last_name)`)
    .eq("status", status)
    .order("submitted_at", { ascending: status === "submitted" })
    .limit(limit);
  if (error) throw new Error("No se pudieron cargar los check-ins.");
  const rows = data ?? [];
  const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
  const prevByClient = new Map<string, CheckinRow[]>();
  if (clientIds.length) {
    const { data: hist } = await supabase.from("checkins").select(CHECKIN_COLS).in("client_id", clientIds).order("week_start", { ascending: false }).limit(1000);
    for (const h of hist ?? []) {
      const list = prevByClient.get(h.client_id as string) ?? [];
      list.push(normalizeCheckin(h));
      prevByClient.set(h.client_id as string, list);
    }
  }
  return rows.map((r) => {
    const c = r.clients as unknown as { first_name: string; last_name: string } | null;
    const row = normalizeCheckin(r);
    const previous = (prevByClient.get(row.client_id) ?? []).find((h) => h.week_start < row.week_start) ?? null;
    return { ...row, client_name: c ? `${c.first_name} ${c.last_name}`.trim() : "Cliente", previous };
  });
}

/** Clientes con acceso que todavía no enviaron el check-in de esta semana. */
export async function listPendingCheckins(monday: string) {
  const supabase = await createClient();
  const [{ data: clients }, { data: done }] = await Promise.all([
    supabase.from("coach_client_overview").select("id, first_name, last_name, membership_status, last_checkin_at, status").neq("status", "suspended"),
    supabase.from("checkins").select("client_id").eq("week_start", monday),
  ]);
  const sent = new Set((done ?? []).map((d) => d.client_id as string));
  return (clients ?? [])
    .filter((c) => !sent.has(c.id as string) && ["active", "past_due", "grace"].includes(c.membership_status as string))
    .map((c) => ({ id: c.id as string, name: `${c.first_name} ${c.last_name}`.trim(), last_checkin_at: (c.last_checkin_at as string | null) ?? null }));
}

export async function getCoachCheckinSettings(coachId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("coaches").select("checkin_weekday, checkin_config").eq("id", coachId).maybeSingle();
  return { weekday: (data?.checkin_weekday as number | undefined) ?? 1, config: data?.checkin_config ?? {} };
}
