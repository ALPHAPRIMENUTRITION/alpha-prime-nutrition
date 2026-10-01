"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marca como leídas todas las notificaciones del usuario actual. */
export async function markAllNotificationsReadAction() {
  const profile = await getSessionProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id).is("read_at", null);
  revalidatePath(profile.role === "coach" ? "/coach" : "/portal", "layout");
}
