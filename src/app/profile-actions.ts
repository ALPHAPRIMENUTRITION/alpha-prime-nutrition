"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

/** Guarda la URL de la foto de perfil (solo de la carpeta del propio usuario). */
export async function saveAvatarAction(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sesión vencida." };
  const prefix = `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${me.id}/`;
  if (typeof url !== "string" || !url.startsWith(prefix) || url.length > 500) return { ok: false, error: "Foto inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", me.id);
  if (error) return { ok: false, error: "No se pudo guardar la foto." };
  revalidatePath("/", "layout");
  return { ok: true };
}
