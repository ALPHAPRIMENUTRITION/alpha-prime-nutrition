"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MessageTemplate } from "@/lib/messages";

export async function saveTemplatesAction(list: MessageTemplate[] | null): Promise<{ ok: boolean; error?: string }> {
  const coach = await requireRole("coach");
  let value: MessageTemplate[] | null = null;
  if (list) {
    if (!Array.isArray(list) || list.length > 15) return { ok: false, error: "Máximo 15 mensajes." };
    value = list
      .map((t) => ({ title: String(t?.title ?? "").trim().slice(0, 60), body: String(t?.body ?? "").trim().slice(0, 1500) }))
      .filter((t) => t.title && t.body);
    if (!value.length) return { ok: false, error: "Dejá al menos un mensaje con título y texto." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("coaches").update({ message_templates: value }).eq("id", coach.id);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/coach/mensajes");
  revalidatePath("/coach/solicitudes", "layout");
  return { ok: true };
}
