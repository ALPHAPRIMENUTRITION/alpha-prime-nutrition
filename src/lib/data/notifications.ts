import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/components/notifications/notifications-list";

export async function listMyNotifications(limit = 60): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("No se pudieron cargar las notificaciones.");
  return (data ?? []) as NotificationRow[];
}

export async function countUnread() {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}
