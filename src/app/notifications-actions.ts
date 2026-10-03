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

/** Manda una notificación de prueba a los dispositivos del usuario actual. */
export async function sendTestPushAction(): Promise<{ ok: boolean; devices: number; error?: string }> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, devices: 0, error: "Sesión vencida." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, devices: 0, error: "Falta configurar el servidor." };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { count } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", profile.id);
  if (!count) return { ok: false, devices: 0, error: "Este usuario no tiene ningún celular con notificaciones activadas." };
  const { error } = await admin.from("notifications").insert({
    user_id: profile.id,
    type: "message_new",
    title: "Prueba de notificación ✅",
    body: "Si ves esto, las notificaciones funcionan en este celular.",
    link: profile.role === "coach" ? "/coach/notificaciones" : "/portal/notificaciones",
    read_at: new Date().toISOString(),
  });
  if (error) return { ok: false, devices: count, error: "No se pudo enviar la prueba." };
  return { ok: true, devices: count };
}
